'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import AnalysisPanel from '@/components/AnalysisPanel';
import GraphCanvas from '@/components/GraphCanvas';
import PropertiesPanel from '@/components/PropertiesPanel';
import Ribbon, { type RibbonTab } from '@/components/Ribbon';
import ShortcutsDialog, { type ShortcutsDialogHandle } from '@/components/ShortcutsDialog';
import StatusBar from '@/components/StatusBar';
import { exportCanvasPng, exportCanvasSvg } from '@/lib/canvas-renderer';
import { formatTheta, polarPointToCartesian } from '@/lib/coords';
import {
  fnCartesian,
  fnPolar,
  plainToLatex,
  pointCartesian,
  pointPolar,
  renderKatexString,
} from '@/lib/latex';
import { extractParams } from '@/lib/params';
import { validate } from '@/lib/parser';
import { computeZoomFit } from '@/lib/view-fit';
import type { GraphObject, Tool } from '@/lib/types';
import {
  canRedo,
  canUndo,
  isInputEditable,
  useAppStore,
} from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCloudProjectStore } from '@/store/useCloudProjectStore';

/* —— Input panel constants (from legacy input-panel.js) —— */

const INPUT_TYPES = {
  cartesian: [
    { id: 'function', label: '함수 f(x)', nameDefault: 'f', prefixLatex: '(x)=' },
    { id: 'point', label: '점 A', nameDefault: 'A', prefixLatex: '' },
  ],
  polar: [
    { id: 'polar', label: '극함수 r(θ)', nameDefault: 'r', prefixLatex: '(\\theta)=' },
    { id: 'point-polar', label: '점 (r;θ)', nameDefault: 'A', prefixLatex: '' },
    { id: 'point', label: '점 (x,y)', nameDefault: 'A', prefixLatex: '' },
  ],
} as const;

const TEMPLATES: Record<string, Record<string, { label: string; value: string }[]>> = {
  cartesian: {
    function: [
      { label: '— 템플릿 —', value: '' },
      { label: 'x²', value: 'x^{2}' },
      { label: '분수', value: '\\frac{x}{2}' },
      { label: 'sin', value: '\\sin(x)' },
      { label: 'cos', value: '\\cos(x)' },
      { label: 'e^x', value: 'e^{x}' },
      { label: 'ln', value: '\\ln(x)' },
      { label: '√x', value: '\\sqrt{x}' },
    ],
    point: [
      { label: '— 템플릿 —', value: '' },
      { label: '(0,0)', value: '(0,\\,0)' },
      { label: '(1.5, 2.5)', value: '(1.5,\\,2.5)' },
    ],
  },
  polar: {
    polar: [
      { label: '— 템플릿 —', value: '' },
      { label: '마카로니', value: '1+\\cos(\\theta)' },
      { label: '원', value: '2' },
      { label: '장미', value: '\\sin(3\\theta)' },
    ],
    'point-polar': [
      { label: '— 템플릿 —', value: '' },
      { label: '(1;0°)', value: '(1;\\,0^{\\circ})' },
      { label: '(2;45°)', value: '(2;\\,45^{\\circ})' },
    ],
    point: [{ label: '— 템플릿 —', value: '' }, { label: '(1,0)', value: '(1,\\,0)' }],
  },
};

const PAD_ROWS = [
  ['7', '8', '9', 'x^2', 'sin', 'cos', 'tan'],
  ['4', '5', '6', 'cdot', 'sqrt', 'ln', 'log'],
  ['1', '2', '3', 'frac', 'pi', 'theta', 'e'],
  ['0', '.', '+', '-', '(', ')', '←'],
  ['x', 'theta', 'abs'],
];

const PAD_LATEX: Record<string, string> = {
  '7': '7', '8': '8', '9': '9', '4': '4', '5': '5', '6': '6',
  '1': '1', '2': '2', '3': '3', '0': '0', '.': '.', '+': '+', '-': '-',
  '(': '(', ')': ')',
  x: 'x', 'x^2': 'x^{2}', theta: '\\theta',
  sin: '\\sin\\left(x\\right)', cos: '\\cos\\left(x\\right)', tan: '\\tan\\left(x\\right)',
  sqrt: '\\sqrt{x}', ln: '\\ln\\left(x\\right)', log: '\\log\\left(x\\right)',
  cdot: ' \\cdot ', frac: '\\frac{}{}', pi: '\\pi', e: 'e', abs: '\\left|x\\right|',
};

const TOOL_LABELS: Record<Tool, { cartesian: string; polar: string }> = {
  move: { cartesian: '이동', polar: '이동' },
  function: { cartesian: '함수 그리기', polar: '극곡선 그리기' },
  point: { cartesian: '점', polar: '점' },
  input: { cartesian: '입력', polar: '입력' },
};

function fmtNum(n: number) {
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return n.toFixed(3).replace(/\.?0+$/, '');
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function zoomFit() {
  const s = useAppStore.getState();
  const fit = computeZoomFit(s.objects, s.getViewState());
  if (fit) useAppStore.setState(fit);
}

function objectLatex(obj: GraphObject, isPolar: boolean): string {
  if (obj.type === 'function-sketch') {
    return obj.equationDisplayLatex || fnCartesian(obj.name, obj.equationDisplay?.replace(/^[^=]+=\s*/, '') || '\\cdots');
  }
  if (obj.type === 'polar-sketch') {
    return obj.equationDisplayLatex || fnPolar(obj.name, obj.equationDisplay?.replace(/^[^=]+=\s*/, '') || '\\cdots');
  }
  if (obj.type === 'function-explicit') {
    return obj.displayLatex || fnCartesian(obj.name, obj.expr);
  }
  if (obj.type === 'polar-explicit') {
    return obj.displayLatex || fnPolar(obj.name, obj.expr);
  }
  if (obj.type === 'point') {
    if (obj.displayLatex) return obj.displayLatex;
    if (obj.polar && isPolar) return pointPolar(obj.name, obj.polar.r, obj.polar.theta);
    return pointCartesian(obj.name, obj.x, obj.y);
  }
  return '';
}

function KatexHtml({ latex }: { latex: string }) {
  const html = useMemo(() => renderKatexString(latex), [latex]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/* —— Data import dialog —— */

function DataImportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const importDataFit = useAppStore((s) => s.importDataFit);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (open && !dlg.open) dlg.showModal();
    if (!open && dlg.open) dlg.close();
  }, [open]);

  const onImport = () => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const rows: { x: number; y: number }[] = [];
    for (const line of lines) {
      const parts = line.split(/[,;\s\t]+/).map((p) => p.trim()).filter(Boolean);
      if (parts.length < 2) continue;
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (Number.isFinite(x) && Number.isFinite(y)) rows.push({ x, y });
    }
    rows.sort((a, b) => a.x - b.x);
    importDataFit(rows);
    setText('');
    onClose();
  };

  return (
    <dialog ref={dialogRef} className="app-dialog data-import-dialog" onClose={onClose}>
      <h2>데이터 가져오기</h2>
      <p style={{ fontSize: 12, marginBottom: 8 }}>
        CSV 형식으로 x, y 값을 붙여넣으세요. 한 줄에 한 점 (쉼표 또는 공백 구분).
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'0, 0\n1, 1\n2, 4'}
        spellCheck={false}
      />
      <div className="dialog-actions">
        <button type="button" onClick={onClose}>
          취소
        </button>
        <button type="button" className="btn-primary" onClick={onImport}>
          가져오기
        </button>
      </div>
    </dialog>
  );
}

/* —— Main workbench —— */

export default function Workbench() {
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const projectTitle = useCloudProjectStore((s) => s.currentProjectTitle);
  const syncStatus = useCloudProjectStore((s) => s.syncStatus);
  const isDirty = useCloudProjectStore((s) => s.isDirty);
  const saveCurrent = useCloudProjectStore((s) => s.saveCurrent);
  const setPickerOpen = useCloudProjectStore((s) => s.setPickerOpen);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exprRef = useRef<HTMLInputElement>(null);

  const [ribbonTab, setRibbonTab] = useState<RibbonTab>('home');
  const [dataImportOpen, setDataImportOpen] = useState(false);
  const [inputType, setInputType] = useState('function');
  const [inputName, setInputName] = useState('f');
  const [inputExpr, setInputExpr] = useState('');
  const [nameAuto, setNameAuto] = useState(true);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const objects = useAppStore((s) => s.objects);
  const selectedId = useAppStore((s) => s.selectedId);
  const editingId = useAppStore((s) => s.editingId);
  const tool = useAppStore((s) => s.tool);
  const coordMode = useAppStore((s) => s.coordMode);
  const fitMethodCartesian = useAppStore((s) => s.fitMethodCartesian);
  const fitMethodPolar = useAppStore((s) => s.fitMethodPolar);
  const view = useAppStore((s) => s.view);
  const algebraCollapsed = useAppStore((s) => s.algebraCollapsed);
  const padOpen = useAppStore((s) => s.padOpen);
  const toasts = useAppStore((s) => s.toasts);
  const analysisTargetId = useAppStore((s) => s.analysisTargetId);
  const fitInProgress = useAppStore((s) => s.fitInProgress);
  const algebraPanelWidth = useAppStore((s) => s.algebraPanelWidth);
  const sidePanelTab = useAppStore((s) => s.sidePanelTab);

  const setTool = useAppStore((s) => s.setTool);
  const setCoordMode = useAppStore((s) => s.setCoordMode);
  const selectObject = useAppStore((s) => s.selectObject);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const toggleView = useAppStore((s) => s.toggleView);
  const setFitMethod = useAppStore((s) => s.setFitMethod);
  const setParamValue = useAppStore((s) => s.setParamValue);
  const newDocument = useAppStore((s) => s.newDocument);
  const saveProject = useAppStore((s) => s.saveProject);
  const loadProject = useAppStore((s) => s.loadProject);
  const deleteSelected = useAppStore((s) => s.deleteSelected);
  const clearInputFunctions = useAppStore((s) => s.clearInputFunctions);
  const submitCommand = useAppStore((s) => s.submitCommand);
  const loadObjectForEdit = useAppStore((s) => s.loadObjectForEdit);
  const cancelEdit = useAppStore((s) => s.cancelEdit);
  const toggleObjectVisibility = useAppStore((s) => s.toggleObjectVisibility);
  const refitSelectedSketch = useAppStore((s) => s.refitSelectedSketch);
  const resetViewHome = useAppStore((s) => s.resetViewHome);
  const setAlgebraPanelWidth = useAppStore((s) => s.setAlgebraPanelWidth);
  const setSidePanelTab = useAppStore((s) => s.setSidePanelTab);
  const toggleAnalysisOverlay = useAppStore((s) => s.toggleAnalysisOverlay);

  const helpRef = useRef<HTMLDialogElement>(null);
  const aboutRef = useRef<HTMLDialogElement>(null);
  const syntaxRef = useRef<HTMLDialogElement>(null);
  const shortcutsRef = useRef<ShortcutsDialogHandle>(null);
  const resizeStartRef = useRef<{ x: number; w: number } | null>(null);

  const isPolar = coordMode === 'polar';
  const fitMethod = isPolar ? fitMethodPolar : fitMethodCartesian;
  const typeOptions = isPolar ? INPUT_TYPES.polar : INPUT_TYPES.cartesian;

  const syncInputType = useCallback(
    (preserveFields = false) => {
      const options = typeOptions;
      const valid = options.some((o) => o.id === inputType);
      const selected = valid ? inputType : options[0].id;
      if (!valid) setInputType(selected);
      const meta = options.find((o) => o.id === selected) || options[0];
      if (!preserveFields && (!valid || nameAuto)) {
        setInputName(meta.nameDefault);
        setNameAuto(true);
      }
    },
    [inputType, nameAuto, typeOptions]
  );

  useEffect(() => {
    const options = isPolar ? INPUT_TYPES.polar : INPUT_TYPES.cartesian;
    const valid = options.some((o) => o.id === inputType);
    if (!valid) {
      setInputType(options[0].id);
      setInputName(options[0].nameDefault);
      setNameAuto(true);
    }
  }, [coordMode, isPolar, inputType]);

  const buildCommand = useCallback(() => {
    const expr = inputExpr.trim();
    if (!expr) return '';
    const name = inputName.trim();
    if (inputType === 'function') return `${(name || 'f').toLowerCase()}(x) = ${expr}`;
    if (inputType === 'polar') {
      if (expr.includes('=')) return expr;
      return `${(name || 'r').toLowerCase()}(θ) = ${expr}`;
    }
    if (inputType === 'point-polar') {
      const pt = (name || 'A').toUpperCase();
      const body = expr.startsWith('(') ? expr : `(${expr})`;
      return `${pt} = ${body}`;
    }
    if (inputType === 'point') {
      const pt = (name || 'A').toUpperCase();
      const body = expr.startsWith('(') ? expr : `(${expr})`;
      return `${pt} = ${body}`;
    }
    return expr;
  }, [inputExpr, inputName, inputType]);

  const preview = useMemo(() => {
    const cmd = buildCommand();
    if (!cmd) {
      return {
        ok: false as const,
        html: renderKatexString('\\text{LaTeX 수식을 입력하세요}'),
        icon: '○',
        className: 'input-preview katex-preview',
        isHtml: true,
      };
    }
    const check = validate(cmd, coordMode);
    if (check.ok && check.displayLatex) {
      return {
        ok: true as const,
        html: renderKatexString(check.displayLatex),
        icon: '✓',
        className: 'input-preview katex-preview ok',
        isHtml: true,
      };
    }
    if (check.ok) {
      return {
        ok: true as const,
        html: renderKatexString(plainToLatex(check.display || cmd)),
        icon: '✓',
        className: 'input-preview katex-preview ok',
        isHtml: true,
      };
    }
    return {
      ok: false as const,
      html: check.error || '오류',
      icon: '!',
      className: 'input-preview katex-preview err',
      isHtml: false,
    };
  }, [buildCommand, coordMode]);

  const prefixLatex = useMemo(() => {
    const meta = typeOptions.find((o) => o.id === inputType) || typeOptions[0];
    const n = inputName.trim() || meta.nameDefault;
    if (inputType === 'function') return `${n}${meta.prefixLatex || '(x)='}`;
    if (inputType === 'polar') return `${n}${meta.prefixLatex || '(\\theta)='}`;
    return `${n}=`;
  }, [inputName, inputType, typeOptions]);

  const templates =
    TEMPLATES[isPolar ? 'polar' : 'cartesian'][
      inputType === 'polar' ? 'polar' : inputType === 'point-polar' ? 'point-polar' : inputType === 'point' ? 'point' : 'function'
    ] || [];

  const analysisObj = objects.find(
    (o) => o.id === analysisTargetId && o.type === 'function-explicit',
  );

  const selectedObj = objects.find((o) => o.id === selectedId) ?? null;

  const analysisParams = useMemo(() => {
    if (!analysisObj || analysisObj.type !== 'function-explicit') return [];
    return extractParams(analysisObj._exprSource || analysisObj.expr);
  }, [analysisObj]);

  const sketchFitObj = objects.find(
    (o) =>
      o.id === selectedId &&
      (o.type === 'function-sketch' || o.type === 'polar-sketch') &&
      o.equation,
  );

  const handleAction = (action: string) => {
    switch (action) {
      case 'undo':
        undo();
        break;
      case 'redo':
        redo();
        break;
      case 'delete':
        deleteSelected();
        break;
      case 'edit-object':
        if (selectedId) loadObjectForEdit(selectedId);
        break;
      case 'clear-input-functions':
        clearInputFunctions();
        break;
      case 'new':
        newDocument();
        useCloudProjectStore.setState({
          currentProjectId: null,
          currentProjectTitle: 'Untitled',
          isDirty: true,
          syncStatus: 'idle',
        });
        cancelEditLocal();
        break;
      case 'save':
        void saveCurrent();
        break;
      case 'export-json':
        saveProject();
        break;
      case 'cloud-projects':
        setPickerOpen(true);
        break;
      case 'load':
        fileInputRef.current?.click();
        break;
      case 'export-png': {
        const canvas = canvasRef.current;
        if (canvas) downloadBlob(awaitDataUrlToBlob(exportCanvasPng(canvas)), 'graph.png');
        break;
      }
      case 'export-svg': {
        const canvas = canvasRef.current;
        if (canvas) {
          const svg = exportCanvasSvg(canvas);
          downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), 'graph.svg');
        }
        break;
      }
      case 'zoom-in':
        useAppStore.setState((s) => ({ unitScale: s.unitScale * 1.15 }));
        break;
      case 'zoom-out':
        useAppStore.setState((s) => ({ unitScale: s.unitScale / 1.15 }));
        break;
      case 'zoom-fit':
        zoomFit();
        break;
      case 'help':
        helpRef.current?.showModal();
        break;
      case 'shortcuts':
        shortcutsRef.current?.show();
        break;
      case 'about':
        aboutRef.current?.showModal();
        break;
      case 'data-import':
        setDataImportOpen(true);
        break;
      default:
        break;
    }
  };

  function awaitDataUrlToBlob(dataUrl: string) {
    const [header, body] = dataUrl.split(',');
    const mime = header.match(/:(.*?);/)?.[1] || 'image/png';
    const binary = atob(body);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function cancelEditLocal() {
    cancelEdit();
    setInputExpr('');
    setNameAuto(true);
    syncInputType();
  }

  const pushCmdHistory = (cmd: string) => {
    if (!cmd) return;
    setCmdHistory((prev) => {
      if (prev[prev.length - 1] === cmd) return prev;
      const next = [...prev, cmd];
      if (next.length > 40) next.shift();
      return next;
    });
    setHistoryIndex(-1);
  };

  const onSubmitInput = () => {
    const cmd = buildCommand();
    if (!cmd) {
      useAppStore.getState().addToast('식을 입력하세요.', 'error');
      return;
    }
    const check = validate(cmd, coordMode);
    if (!check.ok) {
      useAppStore.getState().addToast(check.error, 'error');
      return;
    }
    const editId = editingId;
    if (!editId) pushCmdHistory(cmd);
    const ok = submitCommand(cmd, editId);
    if (ok) {
      setInputExpr('');
      setNameAuto(true);
      syncInputType();
    }
  };

  const loadFromObject = (obj: GraphObject) => {
    const loaded = loadObjectForEdit(obj.id);
    if (!loaded) return;
    if (loaded.type === 'function-explicit') {
      setInputType('function');
      setInputName(loaded.name);
      setInputExpr(loaded.exprLatex || loaded.expr || '');
    } else if (loaded.type === 'polar-explicit') {
      setInputType('polar');
      setInputName(loaded.name);
      setInputExpr(loaded.exprLatex || loaded.expr || '');
    } else if (loaded.type === 'point') {
      setInputType(loaded.polar && isPolar ? 'point-polar' : 'point');
      setInputName(loaded.name);
      if (loaded.polar && isPolar) {
        setInputExpr(
          `(${loaded.polar.r}; ${formatTheta(loaded.polar.theta)})`
        );
      } else {
        setInputExpr(`(${loaded.x}, ${loaded.y})`);
      }
    }
    setNameAuto(false);
    syncInputType(true);
    exprRef.current?.focus();
  };

  const insertAtCursor = (text: string) => {
    const mapped = PAD_LATEX[text];
    const insert = mapped ?? text;
    const input = exprRef.current;
    if (!input) {
      setInputExpr((v) => v + insert);
      return;
    }
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    const next = input.value.slice(0, start) + insert + input.value.slice(end);
    setInputExpr(next);
    const pos = start + insert.length;
    requestAnimationFrame(() => {
      input.setSelectionRange(pos, pos);
      input.focus();
    });
  };

  const onPadClick = (key: string) => {
    if (key === '←') {
      const input = exprRef.current;
      if (!input) return;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      if (start !== end) {
        setInputExpr(input.value.slice(0, start) + input.value.slice(end));
      } else if (start > 0) {
        setInputExpr(input.value.slice(0, start - 1) + input.value.slice(start));
      }
      return;
    }
    let ins = key;
    if (key === 'x' && isPolar && inputType === 'polar') ins = 'theta';
    else if (key === 'theta' && !isPolar && inputType === 'function') ins = 'x';
    insertAtCursor(ins === 'pi' ? 'pi' : ins);
  };

  const padKeyLabel = (key: string) => {
    if (key === '←') return '⌫';
    if (key === 'frac') return 'a/b';
    if (key === 'cdot') return '·';
    if (key === 'x^2') return 'x²';
    if (key === 'theta') return 'θ';
    return key;
  };

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        handleAction('new');
        return;
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleAction('save');
        return;
      }
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault();
        handleAction('load');
        return;
      }
      if (e.key === 'Delete' && selectedId && !inInput) {
        deleteSelected();
        return;
      }
      if (e.key === 'Escape' && !inInput) {
        const editId = useAppStore.getState().editingId;
        if (editId) cancelEditLocal();
        else selectObject(null);
        return;
      }
      if (e.key === 'F1') {
        e.preventDefault();
        shortcutsRef.current?.show();
        return;
      }
      if (e.ctrlKey && e.key === 'r' && !inInput) {
        e.preventDefault();
        refitSelectedSketch();
        return;
      }
      if (e.key === 'Home' && !inInput) {
        e.preventDefault();
        resetViewHome();
        return;
      }
      if (e.key === 'F2' && selectedId) {
        e.preventDefault();
        loadObjectForEdit(selectedId);
        return;
      }
      if (!e.ctrlKey && !e.altKey && !inInput) {
        const key = e.key.toLowerCase();
        if (key === 'm') setTool('move');
        else if (key === 'f') setTool('function');
        else if (key === 'p') setTool('point');
        else if (key === 'i') {
          setTool('input');
          exprRef.current?.focus();
        }         else if (key === '1') setCoordMode('cartesian');
        else if (key === '2') setCoordMode('polar');
        else if (key === '+' || key === '=') handleAction('zoom-in');
        else if (key === '-') handleAction('zoom-out');
        else if (key === '0') handleAction('zoom-fit');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    const onMove = (e: globalThis.MouseEvent) => {
      if (!resizeStartRef.current) return;
      const delta = e.clientX - resizeStartRef.current.x;
      setAlgebraPanelWidth(resizeStartRef.current.w + delta);
    };
    const onUp = () => {
      resizeStartRef.current = null;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [setAlgebraPanelWidth]);

  const startPanelResize = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { x: e.clientX, w: algebraPanelWidth };
  };

  const undoEnabled = canUndo();
  const redoEnabled = canRedo();
  const toolStatus = fitInProgress
    ? '근사 계산 중…'
    : TOOL_LABELS[tool][isPolar ? 'polar' : 'cartesian'];

  const onFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        loadProject(reader.result);
        useCloudProjectStore.setState({
          currentProjectId: null,
          currentProjectTitle: file.name.replace(/\.json$/i, '') || 'Imported',
          isDirty: true,
          syncStatus: 'idle',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const onExprKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && editingId) {
      e.preventDefault();
      cancelEditLocal();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmitInput();
    } else if (e.key === 'ArrowUp' && e.ctrlKey) {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const idx = historyIndex < 0 ? cmdHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(idx);
      setInputExpr(cmdHistory[idx]);
    } else if (e.key === 'ArrowDown' && e.ctrlKey) {
      e.preventDefault();
      if (historyIndex < 0) return;
      const idx = historyIndex + 1;
      if (idx >= cmdHistory.length) {
        setHistoryIndex(-1);
        setInputExpr('');
      } else {
        setHistoryIndex(idx);
        setInputExpr(cmdHistory[idx]);
      }
    }
  };

  return (
    <div className={`app${padOpen ? ' command-pad-expanded' : ''}`}>
      <Ribbon
        activeTab={ribbonTab}
        onTabChange={setRibbonTab}
        tool={tool}
        isPolar={isPolar}
        coordMode={coordMode}
        fitMethod={fitMethod}
        view={view}
        algebraCollapsed={algebraCollapsed}
        undoEnabled={undoEnabled}
        redoEnabled={redoEnabled}
        onTool={(t) => {
          setTool(t);
          if (t === 'input') exprRef.current?.focus();
        }}
        onCoordMode={setCoordMode}
        onFitMethod={setFitMethod}
        onAction={handleAction}
        onToggleView={(key, value) => {
          if (value !== undefined) toggleView(key as 'showGrid', value);
          else toggleView(key as 'showGrid');
        }}
        onToggleAnalysis={toggleAnalysisOverlay}
        onToggleAlgebraPanel={(visible) => useAppStore.setState({ algebraCollapsed: !visible })}
        onFocusInput={() => exprRef.current?.focus()}
        projectTitle={projectTitle}
        syncLabel={
          syncStatus === 'saving'
            ? 'Saving…'
            : syncStatus === 'error'
              ? 'Sync error'
              : isDirty
                ? 'Unsaved'
                : syncStatus === 'saved'
                  ? 'Saved'
                  : undefined
        }
        userName={authUser?.name}
      />

      <nav className="nav-bar" aria-label="탐색">
        <div className="nav-bar-path">
          <span className="nav-segment">Curvify</span>
          <span className="nav-separator">›</span>
          <span className="nav-segment">{projectTitle}</span>
          <span className="nav-separator">›</span>
          <span className="nav-segment current">
            {isPolar ? '극좌표 그래프' : '직교좌표 그래프'}
          </span>
          {selectedObj && (
            <>
              <span className="nav-separator">›</span>
              <span className="nav-segment current">{selectedObj.name}</span>
            </>
          )}
        </div>
        <span className="nav-bar-status">{toolStatus}</span>
      </nav>

      <div className="workspace">
        <aside
          className={`algebra-panel${algebraCollapsed ? ' collapsed' : ''}`}
          style={algebraCollapsed ? undefined : { width: algebraPanelWidth }}
          aria-label="워크스페이스"
        >
          <div className="panel-header">
            <div className="panel-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                className={`panel-tab${sidePanelTab === 'objects' ? ' active' : ''}`}
                aria-selected={sidePanelTab === 'objects'}
                onClick={() => setSidePanelTab('objects')}
              >
                워크스페이스
              </button>
              <button
                type="button"
                role="tab"
                className={`panel-tab${sidePanelTab === 'analysis' ? ' active' : ''}`}
                aria-selected={sidePanelTab === 'analysis'}
                onClick={() => setSidePanelTab('analysis')}
              >
                분석
              </button>
              <button
                type="button"
                role="tab"
                className={`panel-tab${sidePanelTab === 'properties' ? ' active' : ''}`}
                aria-selected={sidePanelTab === 'properties'}
                onClick={() => setSidePanelTab('properties')}
              >
                속성
              </button>
            </div>
            <button
              type="button"
              className="panel-close"
              title="패널 닫기"
              aria-label="대수 패널 닫기"
              onClick={() => useAppStore.setState({ algebraCollapsed: true })}
            >
              ×
            </button>
          </div>

          {sidePanelTab === 'properties' ? (
            <div className="panel-tab-body">
              <PropertiesPanel obj={selectedObj} isPolar={isPolar} />
            </div>
          ) : sidePanelTab === 'analysis' ? (
            <div className="panel-tab-body">
              <AnalysisPanel
                objects={objects}
                isPolar={isPolar}
                paramSliders={
                  analysisObj?.type === 'function-explicit' && analysisParams.length > 0
                    ? analysisParams.map((p) => ({
                        name: p,
                        value: analysisObj.paramValues?.[p] ?? 1,
                        onChange: (v: number) => setParamValue(analysisObj.id, p, v),
                      }))
                    : undefined
                }
              />
            </div>
          ) : (
            <>
          <div className="workspace-table-header" aria-hidden="true">
            <span />
            <span>이름 · 값</span>
          </div>
          <div className="algebra-list" role="list">
            {objects.map((obj) => {
              const hidden = obj.visible === false;
              return (
              <div
                key={obj.id}
                role="listitem"
                className={`algebra-item${selectedId === obj.id ? ' selected' : ''}${editingId === obj.id ? ' editing' : ''}${hidden ? ' obj-hidden' : ''}`}
                onClick={() => selectObject(obj.id)}
                onDoubleClick={(e) => {
                  if ((e.target as HTMLElement).closest('.algebra-action')) return;
                  if (isInputEditable(obj)) loadFromObject(obj);
                }}
              >
                <button
                  type="button"
                  className={`obj-vis-toggle${hidden ? ' off' : ''}`}
                  title={hidden ? '표시' : '숨기기'}
                  aria-label={hidden ? `${obj.name} 표시` : `${obj.name} 숨기기`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleObjectVisibility(obj.id);
                  }}
                >
                  {hidden ? '◌' : '●'}
                </button>
                <span className="obj-icon" style={{ background: obj.color || '#2563eb', opacity: hidden ? 0.35 : 1 }} />
                <div className="obj-label">
                  <div className="obj-latex">
                    <KatexHtml latex={objectLatex(obj, isPolar)} />
                  </div>
                  {(obj.type === 'function-sketch' || obj.type === 'polar-sketch') && obj.equation && (
                    <div className="obj-sub">
                      근사: {obj.equation.methodLabel || obj.equation.method}
                      {obj.equation.rSquared !== undefined &&
                        ` · R²=${obj.equation.rSquared.toFixed(3)}`}
                    </div>
                  )}
                  {obj.type === 'function-sketch' && Number.isFinite(obj.minX) && (
                    <div className="obj-sub">
                      x ∈ [{fmtNum(obj.minX)}, {fmtNum(obj.maxX)}]
                    </div>
                  )}
                  {obj.type === 'polar-sketch' && Number.isFinite(obj.minTheta) && (
                    <div className="obj-sub">
                      θ ∈ [{formatTheta(obj.minTheta)}, {formatTheta(obj.maxTheta)}]
                    </div>
                  )}
                </div>
                {isInputEditable(obj) && (
                  <div className="algebra-item-actions">
                    <button
                      type="button"
                      className="algebra-action"
                      title="수정"
                      aria-label={`${obj.name} 수정`}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectObject(obj.id);
                        loadFromObject(obj);
                      }}
                    >
                      ✎
                    </button>
                  </div>
                )}
              </div>
            );
            })}
          </div>
          <div className="algebra-empty">
            객체가 없습니다. 함수를 그리거나 입력창에 식을 입력하세요.
          </div>

          {sketchFitObj && (sketchFitObj.type === 'function-sketch' || sketchFitObj.type === 'polar-sketch') && sketchFitObj.equation && (
            <section className="inspector-group fit-report-inline" aria-label="근사 리포트">
              <header className="inspector-group-header">근사 리포트</header>
              <div className="inspector-body">
                <dl className="inspector-kv-grid">
                  <dt>방법</dt>
                  <dd>{sketchFitObj.equation.methodLabel || sketchFitObj.equation.method}</dd>
                  {sketchFitObj.equation.rSquared !== undefined && (
                    <>
                      <dt>R²</dt>
                      <dd>{sketchFitObj.equation.rSquared.toFixed(4)}</dd>
                    </>
                  )}
                  {sketchFitObj.equation.diagnostics?.rmse !== undefined && (
                    <>
                      <dt>RMSE</dt>
                      <dd>{sketchFitObj.equation.diagnostics.rmse.toExponential(3)}</dd>
                    </>
                  )}
                  {sketchFitObj.equation.diagnostics?.maxResidual !== undefined && (
                    <>
                      <dt>최대 잔차</dt>
                      <dd>{sketchFitObj.equation.diagnostics.maxResidual.toExponential(3)}</dd>
                    </>
                  )}
                  {sketchFitObj.equation.diagnostics?.sampleCount !== undefined && (
                    <>
                      <dt>표본 수</dt>
                      <dd>{sketchFitObj.equation.diagnostics.sampleCount}</dd>
                    </>
                  )}
                  {sketchFitObj.equation.diagnostics?.degree !== undefined && (
                    <>
                      <dt>차수</dt>
                      <dd>{sketchFitObj.equation.diagnostics.degree}</dd>
                    </>
                  )}
                  {sketchFitObj.equation.diagnostics?.knotCount !== undefined && (
                    <>
                      <dt>노드 수</dt>
                      <dd>{sketchFitObj.equation.diagnostics.knotCount}</dd>
                    </>
                  )}
                  {sketchFitObj.equation.diagnostics?.conditionNumber !== undefined && (
                    <>
                      <dt>조건수</dt>
                      <dd>{sketchFitObj.equation.diagnostics.conditionNumber.toExponential(2)}</dd>
                    </>
                  )}
                </dl>
                {sketchFitObj.equation.diagnostics?.warning && (
                  <p className="inspector-msg">{sketchFitObj.equation.diagnostics.warning}</p>
                )}
              </div>
            </section>
          )}
            </>
          )}
        </aside>
        {!algebraCollapsed && (
          <div
            className="panel-resize-handle"
            role="separator"
            aria-orientation="vertical"
            aria-label="패널 너비 조절"
            onMouseDown={startPanelResize}
          />
        )}

        <div className="figure-container">
          <div className="figure-panel">
            <div className="figure-titlebar">
              <svg className="figure-titlebar-icon" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2 12l3-4 3 2 4-6 2 8H2z" fill="currentColor" />
              </svg>
              <span>Figure 1</span>
              <span className="figure-titlebar-path">
                — {isPolar ? '극좌표' : '직교좌표'} 그래프
              </span>
              <div className="figure-toolbar">
                <button type="button" className="figure-tool-btn" title="확대" onClick={() => handleAction('zoom-in')}>+</button>
                <button type="button" className="figure-tool-btn" title="축소" onClick={() => handleAction('zoom-out')}>−</button>
                <button type="button" className="figure-tool-btn" title="화면 맞춤" onClick={() => handleAction('zoom-fit')}>⊡</button>
                <button type="button" className="figure-tool-btn" title="PNG보내기" onClick={() => handleAction('export-png')}>⤓</button>
              </div>
            </div>
            <GraphCanvas ref={canvasRef} />
          </div>
          {algebraCollapsed && (
            <button
              type="button"
              className="algebra-toggle"
              title="워크스페이스 열기"
              onClick={() => useAppStore.setState({ algebraCollapsed: false })}
            >
              ›
            </button>
          )}
        </div>
      </div>

      <section
        className={`command-window input-dock${padOpen ? ' pad-open' : ''}${editingId ? ' input-editing' : ''}`}
        aria-label="명령 창"
      >
        <div className="command-window-header">
          <span>명령 창</span>
          <div className="command-window-header-actions">
            <button
              type="button"
              className="cmd-header-btn"
              aria-expanded={padOpen}
              title="입력 패드"
              onClick={() => useAppStore.setState({ padOpen: !padOpen })}
            >
              ⌨
            </button>
            <button type="button" className="cmd-header-btn" title="문법 안내" onClick={() => syntaxRef.current?.showModal()}>
              ?
            </button>
          </div>
        </div>
        <div className="command-preview-row">
          <span className={`input-preview-icon${preview.ok ? ' ok' : preview.icon === '!' ? ' err' : ''}`}>
            {preview.icon}
          </span>
          {preview.isHtml ? (
            <span className={preview.className} dangerouslySetInnerHTML={{ __html: preview.html }} />
          ) : (
            <span className={preview.className}>{preview.html}</span>
          )}
        </div>
        <div className="command-input-row input-main-row">
          <span className="command-prompt">fx &gt;&gt;</span>
          <select
            className="input-type-select"
            value={inputType}
            onChange={(e) => {
              if (editingId) cancelEditLocal();
              setInputType(e.target.value);
              syncInputType();
            }}
          >
            {typeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <div className="input-structured">
            <input
              type="text"
              className="input-name"
              maxLength={3}
              value={inputName}
              onChange={(e) => {
                setNameAuto(false);
                setInputName(e.target.value);
              }}
              aria-label="객체 이름"
            />
            <span className="input-prefix">
              <KatexHtml latex={prefixLatex} />
            </span>
            <input
              ref={exprRef}
              type="text"
              className="command-input"
              value={inputExpr}
              onChange={(e) => setInputExpr(e.target.value)}
              onKeyDown={onExprKeyDown}
              placeholder={
                inputType === 'function'
                  ? 'x^{2} + \\frac{1}{2}\\sin(x)'
                  : inputType === 'polar'
                    ? '1 + \\cos(\\theta)'
                    : '(3,\\,4)'
              }
              autoComplete="off"
              spellCheck={false}
              aria-label="LaTeX 수식"
            />
          </div>
          <button
            type="button"
            className="btn-input-submit"
            onClick={onSubmitInput}
            title={editingId ? '수정 적용 (Enter)' : '입력 실행 (Enter)'}
          >
            {editingId ? '수정' : '입력'}
          </button>
          {!editingId ? null : (
            <button type="button" className="btn-input-cancel" title="편집 취소 (Esc)" onClick={cancelEditLocal}>
              취소
            </button>
          )}
        </div>
        <div className="input-pad" hidden={!padOpen}>
          <div className="input-pad-toolbar">
            <select
              className="input-template-select"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  insertAtCursor(e.target.value);
                  e.target.value = '';
                }
              }}
            >
              {templates.map((t) => (
                <option key={t.label} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="pad-tool-btn"
              title="이전 입력 (Ctrl+↑)"
              onClick={() => {
                if (!cmdHistory.length) return;
                const idx = historyIndex < 0 ? cmdHistory.length - 1 : Math.max(0, historyIndex - 1);
                setHistoryIndex(idx);
                setInputExpr(cmdHistory[idx]);
              }}
            >
              ↑
            </button>
            <button
              type="button"
              className="pad-tool-btn"
              title="다음 입력 (Ctrl+↓)"
              onClick={() => {
                if (historyIndex < 0) return;
                const idx = historyIndex + 1;
                if (idx >= cmdHistory.length) {
                  setHistoryIndex(-1);
                  setInputExpr('');
                } else {
                  setHistoryIndex(idx);
                  setInputExpr(cmdHistory[idx]);
                }
              }}
            >
              ↓
            </button>
            <button
              type="button"
              className="pad-tool-btn"
              title={editingId ? '편집 취소' : '식 지우기'}
              onClick={() => (editingId ? cancelEditLocal() : setInputExpr(''))}
            >
              C
            </button>
          </div>
          <div className="input-pad-grid" role="group" aria-label="기호 패드">
            {PAD_ROWS.map((row, ri) =>
              row.map((key, ci) => (
                <button
                  key={`${ri}-${ci}`}
                  type="button"
                  className={`pad-key pad-${key === 'x' || key === 'theta' || key === 'abs' ? 'var' : 'num'}`}
                  title={PAD_LATEX[key] || key}
                  onClick={() => onPadClick(key)}
                >
                  {padKeyLabel(key)}
                </button>
              ))
            )}
          </div>
        </div>
      </section>

      <StatusBar />

      <div className="toast-container" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} role="status">
            <span className="toast-label">{t.type}</span>
            <span className="toast-message">{t.message}</span>
          </div>
        ))}
      </div>

      <dialog ref={helpRef} className="app-dialog">
        <h2>사용법</h2>
        <ul>
          <li>
            <strong>좌표계</strong>: 툴바에서 <em>직교</em> / <em>극좌표</em> 전환 (단축키 1, 2)
          </li>
          <li>
            <strong>직교 — 함수 그리기</strong>: x 방향으로 한 번에 스케치. <code>f(x)=x^2</code>
          </li>
          <li>
            <strong>극좌표 — 극곡선</strong>: θ가 한 방향으로 증가하도록 스케치
          </li>
          <li>
            <strong>근사 방법</strong>: 툴바에서 다항식, sin/cos, 지수 등 선택
          </li>
          <li>
            <strong>이동</strong>: 드래그로 팬, 휠로 확대/축소
          </li>
          <li>
            <strong>단축키</strong>: M 이동, F 그리기, P 점, I 입력, Ctrl+Z/Y/N/S/O, Del, F2
          </li>
        </ul>
        <form method="dialog">
          <button type="submit" className="btn-primary">
            닫기
          </button>
        </form>
      </dialog>

      <dialog ref={syntaxRef} className="app-dialog syntax-dialog">
        <h2>LaTeX 입력 문법</h2>
        <div className="syntax-grid">
          <section>
            <h3>직교좌표</h3>
            <table>
              <tbody>
                <tr>
                  <th>함수</th>
                  <td>
                    <code>x^{'{'}2{'}'} + 1</code> (이름 f → f(x)=…)
                  </td>
                </tr>
                <tr>
                  <th>점</th>
                  <td>
                    <code>(3, 4)</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
          <section>
            <h3>극좌표</h3>
            <table>
              <tbody>
                <tr>
                  <th>극함수</th>
                  <td>
                    <code>1 + \cos(\theta)</code>
                  </td>
                </tr>
                <tr>
                  <th>점</th>
                  <td>
                    <code>(2; 45°)</code>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
        <form method="dialog">
          <button type="submit" className="btn-primary">
            닫기
          </button>
        </form>
      </dialog>

      <dialog ref={aboutRef} className="app-dialog">
        <h2>Curvify</h2>
        <p>
          직교·극좌표 워크스페이스. 손그림 곡선을 수식으로 근사하고, 입력창으로 함수·극방정식·점을
          정의합니다.
        </p>
        {authUser && (
          <p style={{ fontSize: 12, color: 'var(--gg-text-muted)', marginBottom: 12 }}>
            Signed in as <strong>{authUser.name}</strong> ({authUser.email})
          </p>
        )}
        <form method="dialog" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="submit" className="btn-primary">
            닫기
          </button>
          <button
            type="button"
            className="btn-input-cancel"
            onClick={() => {
              aboutRef.current?.close();
              void logout().then(() => router.push('/'));
            }}
          >
            Log out
          </button>
        </form>
      </dialog>

      <DataImportDialog open={dataImportOpen} onClose={() => setDataImportOpen(false)} />
      <ShortcutsDialog ref={shortcutsRef} />

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        aria-hidden
        onChange={onFileLoad}
      />
    </div>
  );
}
