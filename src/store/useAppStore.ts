import { create } from 'zustand';
import type {
  CoordMode,
  GraphObject,
  GraphPoint,
  HudState,
  Tool,
  ToastType,
  ViewOptions,
  ViewState,
} from '@/lib/types';
import {
  cartesianPointerDown,
  cartesianPointerMove,
  finishCartesianStroke,
  finishPolarStroke,
  initialCartesianStroke,
  initialPolarStroke,
  addPolarSample,
  type CartesianStrokeState,
  type PolarStrokeState,
} from '@/lib/sketch-engine';
import {
  refitAllAsync,
  getOptions,
  applyCartesianSketchAsync,
  applyPolarSketchAsync,
} from '@/lib/fit-models';
import { validate, compileExpression, compilePolarExpression } from '@/lib/parser';
import { deserializeProject, downloadJson, recompileExplicit, serializeProject } from '@/lib/project';
import { toPolar, polarPointToCartesian } from '@/lib/coords';
import { extractParams, defaultParamValue } from '@/lib/params';
import { getVisibleBounds } from '@/lib/transform';
import { isAnalyzableCartesian, sketchDomain } from '@/lib/analysis-utils';
import type { FunctionSketch, PolarSketch } from '@/lib/types';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface AppStore {
  objects: GraphObject[];
  selectedId: string | null;
  nextId: number;
  tool: Tool;
  coordMode: CoordMode;
  fitMethodCartesian: string;
  fitMethodPolar: string;
  unitScale: number;
  panX: number;
  panY: number;
  view: ViewOptions;
  history: GraphObject[][];
  historyIndex: number;
  cartesianStroke: CartesianStrokeState;
  polarStroke: PolarStrokeState;
  editingId: string | null;
  algebraCollapsed: boolean;
  padOpen: boolean;
  toasts: Toast[];
  hud: HudState;
  analysisTargetId: string | null;
  canvasView: ViewState;
  fitInProgress: boolean;
  algebraPanelWidth: number;
  sidePanelTab: 'objects' | 'properties' | 'analysis';

  // actions
  setCanvasView: (v: Partial<ViewState>) => void;
  setTool: (tool: Tool) => void;
  setCoordMode: (mode: CoordMode) => void;
  selectObject: (id: string | null) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
  setHud: (h: Partial<HudState>) => void;
  toggleView: (key: keyof ViewOptions, value?: boolean) => void;
  setFitMethod: (id: string) => void;
  setAnalysisTarget: (id: string | null) => void;
  setIntegralBounds: (from: number, to: number) => void;
  setIntegralBoundsFromVisible: () => void;
  setIntegralBoundsFromDomain: () => void;
  toggleAnalysisOverlay: (key: 'showDerivative' | 'showIntegral') => void;
  setParamValue: (objectId: string, param: string, value: number) => void;
  newDocument: () => void;
  saveProject: () => void;
  loadProject: (json: string) => void;
  deleteSelected: () => void;
  clearInputFunctions: () => void;
  submitCommand: (cmd: string, editingId?: string | null) => boolean;
  loadObjectForEdit: (id: string) => GraphObject | null;
  cancelEdit: () => void;
  addPoint: (x: number, y: number) => void;
  pointerDown: (mathX: number, mathY: number) => void;
  pointerMove: (mathX: number, mathY: number) => void;
  pointerUp: () => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (factor: number, px: number, py: number) => void;
  importDataFit: (rows: { x: number; y: number }[]) => void;
  refitSelectedSketch: () => void;
  renameObject: (id: string, name: string) => void;
  setObjectColor: (id: string, color: string) => void;
  toggleObjectVisibility: (id: string) => void;
  resetViewHome: () => void;
  setAlgebraPanelWidth: (width: number) => void;
  setSidePanelTab: (tab: 'objects' | 'properties' | 'analysis') => void;
  getViewState: () => ViewState;
}

const defaultView = (): ViewOptions => ({
  showGrid: true,
  showAxes: true,
  showSketchOverlay: true,
  showDerivative: false,
  showIntegral: false,
  integralFrom: -2,
  integralTo: 2,
});

let toastCounter = 0;
let lastWarning = 0;

function cloneObjects(objects: GraphObject[]) {
  return JSON.parse(JSON.stringify(objects)) as GraphObject[];
}

function restoreEvaluators(objects: GraphObject[]) {
  for (const obj of objects) {
    recompileExplicit(obj);
    if (obj.type === 'function-sketch' && obj.points?.length >= 2) {
      obj.minX = obj.points[0].x;
      obj.maxX = obj.points[obj.points.length - 1].x;
    }
    if (obj.type === 'polar-sketch' && obj.polarPoints?.length >= 2) {
      obj.minTheta = obj.polarPoints[0].theta;
      obj.maxTheta = obj.polarPoints[obj.polarPoints.length - 1].theta;
    }
  }
}

function generateId(state: AppStore) {
  return `obj_${state.nextId}`;
}

function nextFunctionName(objects: GraphObject[]) {
  const letters = ['f', 'g', 'h', 'k', 'l', 'm', 'n'];
  for (const letter of letters) {
    if (!objects.some((o) => o.name === letter)) return letter;
  }
  return `f${objects.filter((o) => o.name.startsWith('f')).length + 1}`;
}

function nextPointName(objects: GraphObject[]) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const ch of alphabet) {
    if (!objects.some((o) => o.type === 'point' && o.name === ch)) return ch;
  }
  return `P${objects.filter((o) => o.type === 'point').length + 1}`;
}

async function runSketchFit(
  get: () => AppStore,
  set: (partial: Partial<AppStore> | ((s: AppStore) => Partial<AppStore>)) => void,
  sketchId: string,
  isPolar: boolean,
) {
  set({ fitInProgress: true });
  const s = get();
  const method = isPolar ? s.fitMethodPolar : s.fitMethodCartesian;
  const objects = s.objects.map((o) => ({ ...o })) as GraphObject[];
  const idx = objects.findIndex((o) => o.id === sketchId);
  if (idx < 0) {
    set({ fitInProgress: false });
    return;
  }
  const obj = objects[idx];
  try {
    if (obj.type === 'function-sketch') {
      await applyCartesianSketchAsync(obj as FunctionSketch, method);
    } else if (obj.type === 'polar-sketch') {
      await applyPolarSketchAsync(obj as PolarSketch, method);
    }
    objects[idx] = obj;
    set({ objects: objects as GraphObject[] });
    const eq = (obj.type === 'function-sketch' || obj.type === 'polar-sketch') ? obj.equation : null;
    if (eq?.diagnostics?.warning) get().addToast(eq.diagnostics.warning, 'warning');
  } finally {
    set({ fitInProgress: false });
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  objects: [],
  selectedId: null,
  nextId: 1,
  tool: 'move',
  coordMode: 'cartesian',
  fitMethodCartesian: 'auto',
  fitMethodPolar: 'auto',
  unitScale: 50,
  panX: 0,
  panY: 0,
  view: defaultView(),
  history: [[]],
  historyIndex: 0,
  cartesianStroke: initialCartesianStroke(),
  polarStroke: initialPolarStroke(),
  editingId: null,
  algebraCollapsed: false,
  padOpen: true,
  toasts: [],
  hud: { x: 0, y: 0, visible: false, fnValue: null },
  analysisTargetId: null,
  fitInProgress: false,
  algebraPanelWidth: 280,
  sidePanelTab: 'objects',
  canvasView: {
    centerX: 400,
    centerY: 300,
    unitScale: 50,
    panX: 0,
    panY: 0,
    canvasWidth: 800,
    canvasHeight: 600,
    dpr: 1,
  },

  setCanvasView: (v) => set((s) => ({ canvasView: { ...s.canvasView, ...v, unitScale: s.unitScale, panX: s.panX, panY: s.panY } })),

  getViewState: () => {
    const s = get();
    return { ...s.canvasView, unitScale: s.unitScale, panX: s.panX, panY: s.panY };
  },

  addToast: (message, type = 'info') => {
    if (type === 'warning') {
      const now = Date.now();
      if (now - lastWarning < 1200) return;
      lastWarning = now;
    }
    const id = `toast_${++toastCounter}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 3500);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  pushHistory: () =>
    set((s) => {
      const snapshot = cloneObjects(s.objects);
      let history = s.history.slice(0, s.historyIndex + 1);
      history.push(snapshot);
      if (history.length > 60) history.shift();
      return { history, historyIndex: history.length - 1 };
    }),

  undo: () => {
    const s = get();
    if (s.historyIndex <= 0) return;
    const objects = cloneObjects(s.history[s.historyIndex - 1]);
    restoreEvaluators(objects);
    set({
      objects,
      historyIndex: s.historyIndex - 1,
      selectedId: null,
      editingId: null,
    });
  },

  redo: () => {
    const s = get();
    if (s.historyIndex >= s.history.length - 1) return;
    const objects = cloneObjects(s.history[s.historyIndex + 1]);
    restoreEvaluators(objects);
    set({
      objects,
      historyIndex: s.historyIndex + 1,
      selectedId: null,
      editingId: null,
    });
  },

  setTool: (tool) => {
    set({
      tool,
      cartesianStroke: initialCartesianStroke(),
      polarStroke: initialPolarStroke(),
    });
  },

  setCoordMode: (mode) => {
    set({
      coordMode: mode,
      cartesianStroke: initialCartesianStroke(),
      polarStroke: initialPolarStroke(),
    });
    get().addToast(`${mode === 'polar' ? '극좌표' : '직교좌표'} 모드로 전환했습니다.`);
  },

  selectObject: (id) =>
    set((s) => ({
      selectedId: id,
      analysisTargetId: id,
      sidePanelTab: id ? 'properties' : s.sidePanelTab,
    })),

  toggleView: (key, value) =>
    set((s) => ({ view: { ...s.view, [key]: value ?? !s.view[key] } })),

  setFitMethod: (id) => {
    const s = get();
    const isPolar = s.coordMode === 'polar';
    if (isPolar) set({ fitMethodPolar: id });
    else set({ fitMethodCartesian: id });

    const hasSketch = s.objects.some((o) => o.type === 'function-sketch' || o.type === 'polar-sketch');
    if (hasSketch) {
      const objects = cloneObjects(s.objects);
      set({ objects, fitInProgress: true });
      refitAllAsync(objects, isPolar, id).then(() => {
        set({ objects, fitInProgress: false });
        get().pushHistory();
        const label = getOptions(isPolar).find((o) => o.id === id)?.label ?? id;
        get().addToast(`근사 방법: ${label}`);
      });
    }
  },

  setAnalysisTarget: (id) => set({ analysisTargetId: id }),
  setIntegralBounds: (from, to) => set((s) => ({ view: { ...s.view, integralFrom: from, integralTo: to } })),

  setIntegralBoundsFromVisible: () => {
    const s = get();
    const vb = getVisibleBounds(s.getViewState());
    set({ view: { ...s.view, integralFrom: vb.minX, integralTo: vb.maxX } });
    get().addToast(`적분 구간: [${vb.minX.toFixed(2)}, ${vb.maxX.toFixed(2)}]`);
  },

  setIntegralBoundsFromDomain: () => {
    const s = get();
    const obj = s.objects.find((o) => o.id === s.analysisTargetId);
    if (!obj) {
      get().addToast('분석 대상 함수를 먼저 선택하세요.', 'warning');
      return;
    }
    const domain = sketchDomain(obj);
    if (!domain) {
      get().addToast('스케치 함수 정의역을 사용할 수 없습니다.', 'warning');
      return;
    }
    set({ view: { ...s.view, integralFrom: domain.min, integralTo: domain.max } });
    get().addToast(`적분 구간: [${domain.min.toFixed(2)}, ${domain.max.toFixed(2)}]`);
  },

  toggleAnalysisOverlay: (key) => {
    const s = get();
    const next = !s.view[key];
    let analysisTargetId = s.analysisTargetId;
    if (next && !analysisTargetId) {
      const sel = s.objects.find((o) => o.id === s.selectedId);
      if (sel && isAnalyzableCartesian(sel)) analysisTargetId = sel.id;
      else {
        const first = s.objects.find((o) => isAnalyzableCartesian(o));
        if (first) analysisTargetId = first.id;
      }
    }
    if (next && !analysisTargetId) {
      get().addToast('분석할 f(x) 함수를 선택하세요.', 'warning');
      set({ sidePanelTab: 'analysis', algebraCollapsed: false });
      return;
    }
    set({
      view: { ...s.view, [key]: next },
      analysisTargetId,
      sidePanelTab: next ? 'analysis' : s.sidePanelTab,
      algebraCollapsed: next ? false : s.algebraCollapsed,
    });
  },
  setHud: (h) => set((s) => ({ hud: { ...s.hud, ...h } })),

  setParamValue: (objectId, param, value) => {
    const s = get();
    const objects = s.objects.map((o) => {
      if (o.id !== objectId) return o;
      if (o.type !== 'function-explicit' && o.type !== 'polar-explicit') return o;
      const paramValues = { ...o.paramValues, [param]: value };
      const updated = { ...o, paramValues };
      recompileExplicit(updated);
      return updated;
    });
    set({ objects });
  },

  newDocument: () => {
    set({
      objects: [],
      selectedId: null,
      nextId: 1,
      history: [[]],
      historyIndex: 0,
      cartesianStroke: initialCartesianStroke(),
      polarStroke: initialPolarStroke(),
      editingId: null,
      analysisTargetId: null,
    });
    get().addToast('새 문서를 만들었습니다.');
  },

  saveProject: () => {
    const s = get();
    const doc = serializeProject({
      coordMode: s.coordMode,
      fitMethodCartesian: s.fitMethodCartesian,
      fitMethodPolar: s.fitMethodPolar,
      unitScale: s.unitScale,
      panX: s.panX,
      panY: s.panY,
      view: s.view,
      objects: s.objects,
      nextId: s.nextId,
    });
    downloadJson('sketch-equation.json', doc);
    get().addToast('프로젝트를 저장했습니다.');
  },

  loadProject: (json) => {
    try {
      const doc = deserializeProject(JSON.parse(json));
      restoreEvaluators(doc.objects as GraphObject[]);
      set({
        coordMode: doc.coordMode,
        fitMethodCartesian: doc.fitMethodCartesian,
        fitMethodPolar: doc.fitMethodPolar,
        unitScale: doc.unitScale,
        panX: doc.panX,
        panY: doc.panY,
        view: doc.view,
        objects: doc.objects as GraphObject[],
        nextId: doc.nextId,
        history: [cloneObjects(doc.objects as GraphObject[])],
        historyIndex: 0,
        selectedId: null,
        editingId: null,
      });
      get().addToast('프로젝트를 불러왔습니다.');
    } catch (e) {
      get().addToast(e instanceof Error ? e.message : '불러오기 실패', 'error');
    }
  },

  deleteSelected: () => {
    const s = get();
    if (!s.selectedId) return;
    const id = s.selectedId;
    set({
      objects: s.objects.filter((o) => o.id !== id),
      selectedId: null,
      editingId: s.editingId === id ? null : s.editingId,
      cartesianStroke:
        s.cartesianStroke.activeSketchId === id ? initialCartesianStroke() : s.cartesianStroke,
      polarStroke: s.polarStroke.activeSketchId === id ? initialPolarStroke() : s.polarStroke,
    });
    get().pushHistory();
  },

  clearInputFunctions: () => {
    const s = get();
    const targets = s.objects.filter((o) => o.type === 'function-explicit' || o.type === 'polar-explicit');
    if (!targets.length) {
      get().addToast('초기화할 입력 함수가 없습니다.');
      return;
    }
    const ids = new Set(targets.map((o) => o.id));
    set({
      objects: s.objects.filter((o) => !ids.has(o.id)),
      selectedId: s.selectedId && ids.has(s.selectedId) ? null : s.selectedId,
      editingId: s.editingId && ids.has(s.editingId) ? null : s.editingId,
    });
    get().pushHistory();
    get().addToast(`입력 함수 ${targets.length}개를 초기화했습니다.`);
  },

  submitCommand: (cmd, editingId) => {
    const s = get();
    const input = cmd.trim();
    if (!input) return false;

    const check = validate(input, s.coordMode);
    if (!check.ok) {
      get().addToast(check.error || '오류', 'error');
      return false;
    }
    const result = check.result;
    if (!result) {
      get().addToast('오류', 'error');
      return false;
    }
    const existing = editingId ? s.objects.find((o) => o.id === editingId) : null;

    const nameConflict = (name: string, excludeId: string | null, isPoint: boolean) => {
      if (isPoint) return s.objects.some((o) => o.id !== excludeId && o.type === 'point' && o.name === name);
      return s.objects.some((o) => o.id !== excludeId && o.name === name && o.type !== 'point');
    };

    let objects = [...s.objects];

    if (result.type === 'point') {
      if (nameConflict(result.name, editingId ?? null, true)) {
        get().addToast(`점 ${result.name}이(가) 이미 있습니다.`, 'error');
        return false;
      }
      if (existing) {
        objects = objects.map((o) =>
          o.id === existing.id
            ? {
                ...o,
                name: result.name,
                x: result.x!,
                y: result.y!,
                displayLatex: result.displayLatex,
                ...(result.polar ? { polar: result.polar } : {}),
              }
            : o
        ) as GraphObject[];
      } else {
        const pt: GraphPoint = {
          id: `obj_${s.nextId}`,
          type: 'point',
          name: result.name,
          x: result.x!,
          y: result.y!,
          color: '#e11d48',
          displayLatex: result.displayLatex,
        };
        if (result.polar) pt.polar = result.polar;
        objects.push(pt);
        set({ nextId: s.nextId + 1 });
      }
    } else if (result.type === 'polar-explicit') {
      if (nameConflict(result.name, editingId ?? null, false)) {
        get().addToast(`이름 '${result.name}'이(가) 이미 사용 중입니다.`, 'error');
        return false;
      }
      const compiled = compilePolarExpression(result.expr!);
      if (!compiled.ok) {
        get().addToast(compiled.error, 'error');
        return false;
      }
      const params = extractParams(result.expr!);
      const paramValues = Object.fromEntries(params.map((p) => [p, defaultParamValue(p)]));
      const payload = {
        name: result.name,
        expr: result.expr!,
        display: result.display!,
        displayLatex: result.displayLatex,
        exprLatex: result.exprLatex,
        evaluate: compiled.evaluate,
        _exprSource: result.expr!,
        paramValues,
      };
      if (existing) {
        objects = objects.map((o) => (o.id === existing.id ? { ...o, ...payload } : o)) as GraphObject[];
      } else {
        objects.push({
          id: `obj_${s.nextId}`,
          type: 'polar-explicit',
          color: '#7c3aed',
          ...payload,
        });
        set({ nextId: s.nextId + 1 });
      }
    } else if (result.type === 'function-explicit') {
      if (nameConflict(result.name, editingId ?? null, false)) {
        get().addToast(`이름 '${result.name}'이(가) 이미 사용 중입니다.`, 'error');
        return false;
      }
      const compiled = compileExpression(result.expr!);
      if (!compiled.ok) {
        get().addToast(compiled.error, 'error');
        return false;
      }
      const params = extractParams(result.expr!);
      const paramValues = Object.fromEntries(params.map((p) => [p, defaultParamValue(p)]));
      const payload = {
        name: result.name,
        expr: result.expr!,
        display: result.display!,
        displayLatex: result.displayLatex,
        exprLatex: result.exprLatex,
        evaluate: compiled.evaluate,
        _exprSource: result.expr!,
        paramValues,
      };
      if (existing) {
        objects = objects.map((o) => (o.id === existing.id ? { ...o, ...payload } : o)) as GraphObject[];
      } else {
        objects.push({
          id: `obj_${s.nextId}`,
          type: 'function-explicit',
          color: '#2563eb',
          ...payload,
        });
        set({ nextId: s.nextId + 1 });
      }
    }

    set({
      objects,
      selectedId: existing?.id ?? s.selectedId,
      editingId: null,
      analysisTargetId: existing?.id ?? s.analysisTargetId,
    });
    get().pushHistory();
    get().addToast(existing ? '객체를 수정했습니다.' : '객체를 추가했습니다.');
    return true;
  },

  loadObjectForEdit: (id) => {
    const obj = get().objects.find((o) => o.id === id);
    if (!obj || !['function-explicit', 'polar-explicit', 'point'].includes(obj.type)) {
      get().addToast('입력으로 정의된 객체만 수정할 수 있습니다.', 'warning');
      return null;
    }
    set({ editingId: id, tool: 'input' });
    return obj;
  },

  cancelEdit: () => set({ editingId: null }),

  addPoint: (x, y) => {
    const s = get();
    const name = nextPointName(s.objects);
    const polar = toPolar(x, y);
    const pt: GraphPoint = {
      id: `obj_${s.nextId}`,
      type: 'point',
      name,
      x,
      y,
      color: '#e11d48',
    };
    if (s.coordMode === 'polar') pt.polar = polar;
    set({ objects: [...s.objects, pt], nextId: s.nextId + 1 });
    get().pushHistory();
  },

  pointerDown: (mathX, mathY) => {
    const s = get();
    if (s.tool === 'function') {
      if (s.coordMode === 'polar') {
        const { r, theta } = toPolar(mathX, mathY);
        const sketch = s.objects.find((o) => o.type === 'polar-sketch' && o.id === s.polarStroke.activeSketchId);
        if (sketch && sketch.type === 'polar-sketch' && theta >= sketch.minTheta && theta <= sketch.maxTheta) {
          get().addToast('이미 그려진 θ 구간입니다.', 'warning');
          return;
        }
        set({
          polarStroke: {
            ...initialPolarStroke(),
            activeSketchId: s.polarStroke.activeSketchId,
            isDrawing: true,
            currentStroke: [],
            lastValidTheta: null,
            lastRawTheta: null,
          },
        });
        const st = get().polarStroke;
        const res = addPolarSample(st, theta, r);
        if (res.error) get().addToast(res.error, 'warning');
        else set({ polarStroke: res.stroke });
      } else {
        const res = cartesianPointerDown(s.cartesianStroke, s.objects, { x: mathX, y: mathY });
        if (res.error) get().addToast(res.error, 'warning');
        set({ cartesianStroke: res.stroke });
      }
    } else if (s.tool === 'point') {
      get().addPoint(mathX, mathY);
    } else if (s.tool === 'input') {
      let best: GraphObject | null = null;
      let bestDist = 0.35;
      for (const obj of s.objects) {
        if (obj.type === 'point') {
          const d = Math.hypot(obj.x - mathX, obj.y - mathY);
          if (d < bestDist) {
            bestDist = d;
            best = obj;
          }
        }
      }
      set({ selectedId: best?.id ?? null });
    }
  },

  pointerMove: (mathX, mathY) => {
    const s = get();
    if (s.tool !== 'function') return;

    if (s.coordMode === 'polar' && s.polarStroke.isDrawing) {
      const { r, theta: rawTheta } = toPolar(mathX, mathY);
      if (s.polarStroke.lastRawTheta !== null && Math.abs(rawTheta - s.polarStroke.lastRawTheta) < 1e-5) return;
      const res = addPolarSample(s.polarStroke, rawTheta, r);
      if (res.error) get().addToast(res.error, 'warning');
      if (res.ok) set({ polarStroke: res.stroke });
    } else if (s.coordMode === 'cartesian' && s.cartesianStroke.isDrawing) {
      const res = cartesianPointerMove(s.cartesianStroke, s.objects, { x: mathX, y: mathY });
      if (res.error) get().addToast(res.error, 'warning');
      if (res.finish) {
        get().pointerUp();
        return;
      }
      set({ cartesianStroke: res.stroke });
    }
  },

  pointerUp: () => {
    const s = get();
    const view = s.getViewState();
    const toPixel = (x: number, y: number) => ({
      x: view.centerX + (x - view.panX) * view.unitScale,
      y: view.centerY - (y - view.panY) * view.unitScale,
    });
    const toPolarPx = (r: number, t: number) => {
      const c = polarPointToCartesian({ r, theta: t });
      return toPixel(c.x, c.y);
    };

    if (s.coordMode === 'polar' && s.polarStroke.isDrawing) {
      const res = finishPolarStroke(
        s.polarStroke,
        s.objects,
        toPolarPx,
        () => nextFunctionName(get().objects),
        () => {
          const id = `obj_${get().nextId}`;
          set({ nextId: get().nextId + 1 });
          return id;
        },
      );
      if (res.error) get().addToast(res.error, 'warning');
      if (res.info) get().addToast(res.info);
      set({ objects: res.objects, polarStroke: res.stroke });
      if (res.needsHistory) get().pushHistory();
      if (res.sketchId) void runSketchFit(get, set, res.sketchId, true);
    } else if (s.cartesianStroke.isDrawing) {
      const res = finishCartesianStroke(
        s.cartesianStroke,
        s.objects,
        toPixel,
        () => nextFunctionName(get().objects),
        () => {
          const id = `obj_${get().nextId}`;
          set({ nextId: get().nextId + 1 });
          return id;
        },
      );
      if (res.error) get().addToast(res.error, 'warning');
      if (res.info) get().addToast(res.info);
      set({ objects: res.objects, cartesianStroke: res.stroke });
      if (res.needsHistory) get().pushHistory();
      if (res.sketchId) void runSketchFit(get, set, res.sketchId, false);
    }
  },

  panBy: (dx, dy) => set((s) => ({ panX: s.panX - dx, panY: s.panY + dy })),

  zoomAt: (factor, px, py) => {
    const s = get();
    const view = s.getViewState();
    const mathBefore = {
      x: (px - view.centerX) / view.unitScale + view.panX,
      y: view.panY - (py - view.centerY) / view.unitScale,
    };
    const newScale = Math.max(0.001, Math.min(s.unitScale * factor, 100000));
    const mathAfter = {
      x: (px - view.centerX) / newScale + s.panX,
      y: s.panY - (py - view.centerY) / newScale,
    };
    set({
      unitScale: newScale,
      panX: s.panX + mathBefore.x - mathAfter.x,
      panY: s.panY + mathBefore.y - mathAfter.y,
    });
  },

  importDataFit: (rows) => {
    if (rows.length < 3) {
      get().addToast('최소 3개의 데이터 점이 필요합니다.', 'error');
      return;
    }
    const s = get();
    const name = nextFunctionName(s.objects);
    const sketch: import('@/lib/types').FunctionSketch = {
      id: `obj_${s.nextId}`,
      type: 'function-sketch',
      name,
      points: rows,
      minX: rows[0].x,
      maxX: rows[rows.length - 1].x,
      color: '#059669',
      equation: null,
    };
    set({ objects: [...s.objects, sketch], nextId: s.nextId + 1, selectedId: sketch.id, fitInProgress: true });
    void applyCartesianSketchAsync(sketch, s.fitMethodCartesian).then(() => {
      set((state) => ({
        objects: state.objects.map((o) => (o.id === sketch.id ? { ...sketch } : o)),
        fitInProgress: false,
      }));
    });
    get().pushHistory();
    get().addToast(`데이터 ${rows.length}점으로 회귀했습니다.`);
  },

  refitSelectedSketch: () => {
    const s = get();
    const obj = s.objects.find((o) => o.id === s.selectedId);
    if (!obj || (obj.type !== 'function-sketch' && obj.type !== 'polar-sketch')) {
      get().addToast('스케치 객체를 선택하세요.', 'warning');
      return;
    }
    void runSketchFit(get, set, obj.id, s.coordMode === 'polar').then(() => {
      get().pushHistory();
      get().addToast('스케치를 다시 근사했습니다.');
    });
  },

  renameObject: (id, name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      get().addToast('이름을 입력하세요.', 'warning');
      return;
    }
    if (get().objects.some((o) => o.id !== id && o.name === trimmed)) {
      get().addToast(`"${trimmed}" 이름이 이미 사용 중입니다.`, 'error');
      return;
    }
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, name: trimmed } : o)) as GraphObject[],
    }));
    get().pushHistory();
  },

  setObjectColor: (id, color) => {
    set((s) => ({
      objects: s.objects.map((o) => (o.id === id ? { ...o, color } : o)) as GraphObject[],
    }));
    get().pushHistory();
  },

  toggleObjectVisibility: (id) => {
    set((s) => ({
      objects: s.objects.map((o) => {
        if (o.id !== id) return o;
        return { ...o, visible: o.visible === false ? true : false };
      }) as GraphObject[],
    }));
    get().pushHistory();
  },

  resetViewHome: () => {
    set({ panX: 0, panY: 0, unitScale: 50 });
    get().addToast('원점 보기 (1:1 스케일 기준)');
  },

  setAlgebraPanelWidth: (width) => set({ algebraPanelWidth: Math.max(200, Math.min(480, width)) }),

  setSidePanelTab: (tab) => set({ sidePanelTab: tab }),
}));

export function isInputEditable(obj: GraphObject) {
  return ['function-explicit', 'polar-explicit', 'point'].includes(obj.type);
}

export function canUndo() {
  return useAppStore.getState().historyIndex > 0;
}

export function canRedo() {
  const s = useAppStore.getState();
  return s.historyIndex < s.history.length - 1;
}
