'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import AnalysisLegend from '@/components/AnalysisLegend';
import ContextMenu from '@/components/ContextMenu';
import { drawScene, pickFnValueAt, pickObjectAt } from '@/lib/canvas-renderer';
import { polarPointToCartesian } from '@/lib/coords';
import { sampleSketch } from '@/lib/fit-curve';
import { computeZoomFit } from '@/lib/view-fit';
import { toMathCoord } from '@/lib/transform';
import type { MathPoint } from '@/lib/types';
import { isInputEditable, useAppStore } from '@/store/useAppStore';

export type GraphCanvasHandle = HTMLCanvasElement;

const GraphCanvas = forwardRef<GraphCanvasHandle>(function GraphCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ panX: 0, panY: 0 });

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement);

  const objects = useAppStore((s) => s.objects);
  const selectedId = useAppStore((s) => s.selectedId);
  const tool = useAppStore((s) => s.tool);
  const coordMode = useAppStore((s) => s.coordMode);
  const analysisTargetId = useAppStore((s) => s.analysisTargetId);
  const fitInProgress = useAppStore((s) => s.fitInProgress);

  const pointerDown = useAppStore((s) => s.pointerDown);
  const pointerMove = useAppStore((s) => s.pointerMove);
  const pointerUp = useAppStore((s) => s.pointerUp);
  const zoomAt = useAppStore((s) => s.zoomAt);
  const setCanvasView = useAppStore((s) => s.setCanvasView);
  const getViewState = useAppStore((s) => s.getViewState);
  const setHud = useAppStore((s) => s.setHud);
  const selectObject = useAppStore((s) => s.selectObject);
  const deleteSelected = useAppStore((s) => s.deleteSelected);
  const loadObjectForEdit = useAppStore((s) => s.loadObjectForEdit);
  const toggleObjectVisibility = useAppStore((s) => s.toggleObjectVisibility);
  const refitSelectedSketch = useAppStore((s) => s.refitSelectedSketch);
  const resetViewHome = useAppStore((s) => s.resetViewHome);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const panel = canvas?.parentElement;
    if (!canvas || !panel) return;

    const dpr = window.devicePixelRatio || 1;
    const w = panel.clientWidth;
    const h = panel.clientHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    setCanvasView({
      canvasWidth: w,
      canvasHeight: h,
      centerX: w / 2,
      centerY: h / 2,
      dpr,
    });
  }, [setCanvasView]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const panel = canvas?.parentElement;
    if (!panel) return;

    resizeCanvas();
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(panel);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  useEffect(() => {
    let raf = 0;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const state = useAppStore.getState();
      const viewState = state.getViewState();

      let cartesianPreview: MathPoint[] | undefined;
      if (state.cartesianStroke.isDrawing && state.cartesianStroke.currentStroke.length >= 1) {
        cartesianPreview = sampleSketch(viewState, state.cartesianStroke.currentStroke);
      }

      let polarPreview: MathPoint[] | undefined;
      if (state.polarStroke.isDrawing && state.polarStroke.currentStroke.length >= 1) {
        polarPreview = state.polarStroke.currentStroke.map((p) =>
          polarPointToCartesian(p),
        );
      }

      drawScene(ctx, {
        view: viewState,
        coordMode: state.coordMode,
        viewOptions: state.view,
        objects: state.objects,
        selectedId: state.selectedId,
        cartesianPreview,
        polarPreview,
        analysisTargetId: state.analysisTargetId,
      });

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const getPointer = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const math = toMathCoord(getViewState(), px, py);
      return { px, py, math };
    },
    [getViewState],
  );

  const endPan = useCallback(() => {
    if (panningRef.current) {
      panningRef.current = false;
      canvasRef.current?.classList.remove('panning');
    }
  }, []);

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setContextMenu(null);

    if (e.button === 1 || e.button === 2) {
      panningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      const s = useAppStore.getState();
      panOriginRef.current = { panX: s.panX, panY: s.panY };
      canvasRef.current?.classList.add('panning');
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;

    const ptr = getPointer(e);
    if (!ptr) return;

    if (tool === 'move') {
      const viewState = getViewState();
      const hit = pickObjectAt(objects, viewState, ptr.math.x, ptr.math.y);
      if (hit) {
        selectObject(hit.id);
        return;
      }
      panningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      const s = useAppStore.getState();
      panOriginRef.current = { panX: s.panX, panY: s.panY };
      canvasRef.current?.classList.add('panning');
      return;
    }

    pointerDown(ptr.math.x, ptr.math.y);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ptr = getPointer(e);
    if (!ptr) return;

    const fnValue = pickFnValueAt(objects, selectedId, ptr.math.x);
    setHud({
      x: ptr.math.x,
      y: ptr.math.y,
      visible: true,
      fnValue,
    });

    if (panningRef.current) {
      const s = useAppStore.getState();
      const dx = (e.clientX - panStartRef.current.x) / s.unitScale;
      const dy = (e.clientY - panStartRef.current.y) / s.unitScale;
      useAppStore.setState({
        panX: panOriginRef.current.panX - dx,
        panY: panOriginRef.current.panY + dy,
      });
      return;
    }

    pointerMove(ptr.math.x, ptr.math.y);
  };

  const onMouseUp = () => {
    pointerUp();
    endPan();
  };

  const onMouseLeave = () => {
    pointerUp();
    endPan();
    setHud({ visible: false });
  };

  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    zoomAt(factor, px, py);
  };

  const onContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    endPan();

    const ptr = getPointer(e);
    if (!ptr) return;

    const viewState = getViewState();
    const hit = pickObjectAt(objects, viewState, ptr.math.x, ptr.math.y);
    if (hit) selectObject(hit.id);

    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  useEffect(() => {
    const onWindowUp = () => {
      useAppStore.getState().pointerUp();
      endPan();
    };
    window.addEventListener('mouseup', onWindowUp);
    return () => window.removeEventListener('mouseup', onWindowUp);
  }, [endPan, pointerUp]);

  const selected = objects.find((o) => o.id === selectedId);
  const isSketch = selected?.type === 'function-sketch' || selected?.type === 'polar-sketch';

  const contextItems = [
    { id: 'select-none', label: '선택 해제', shortcut: 'Esc' },
    { id: 'sep1', label: '', separator: true },
    {
      id: 'edit',
      label: '수정…',
      shortcut: 'F2',
      disabled: !selected || !isInputEditable(selected),
    },
    {
      id: 'refit',
      label: '다시 근사',
      shortcut: 'Ctrl+R',
      disabled: !isSketch,
    },
    {
      id: 'toggle-vis',
      label: selected?.visible === false ? '표시' : '숨기기',
      disabled: !selected,
    },
    { id: 'delete', label: '삭제', shortcut: 'Del', disabled: !selected },
    { id: 'sep2', label: '', separator: true },
    { id: 'zoom-fit', label: '화면 맞춤', shortcut: '0' },
    { id: 'home', label: '원점 보기', shortcut: 'Home' },
  ];

  const onContextAction = (id: string) => {
    switch (id) {
      case 'select-none':
        selectObject(null);
        break;
      case 'edit':
        if (selectedId) loadObjectForEdit(selectedId);
        break;
      case 'refit':
        refitSelectedSketch();
        break;
      case 'toggle-vis':
        if (selectedId) toggleObjectVisibility(selectedId);
        break;
      case 'delete':
        deleteSelected();
        break;
      case 'zoom-fit': {
        const s = useAppStore.getState();
        const fit = computeZoomFit(s.objects, s.getViewState());
        if (fit) useAppStore.setState(fit);
        break;
      }
      case 'home':
        resetViewHome();
        break;
      default:
        break;
    }
  };

  const toolClass = `tool-${tool}`;
  const panelClass = coordMode === 'polar' ? 'graphics-panel mode-polar' : 'graphics-panel';

  return (
    <main className={panelClass}>
      <div className={`coord-badge${coordMode === 'polar' ? ' polar' : ''}`}>
        {coordMode === 'polar' ? '극좌표 (r, θ)' : '직교좌표 (x, y)'}
      </div>
      <canvas
        ref={canvasRef}
        id="graphCanvas"
        className={toolClass}
        aria-label="그래프 보기"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onWheel={onWheel}
        onContextMenu={onContextMenu}
      />
      {fitInProgress && (
        <div className="canvas-loading-overlay" aria-live="polite" aria-busy="true">
          <div className="canvas-loading-inner">
            <span className="canvas-spinner" />
            <span>근사 계산 중…</span>
          </div>
        </div>
      )}
      <AnalysisLegend />
      <ContextMenu
        open={contextMenu !== null}
        x={contextMenu?.x ?? 0}
        y={contextMenu?.y ?? 0}
        items={contextItems}
        onSelect={onContextAction}
        onClose={() => setContextMenu(null)}
      />
    </main>
  );
});

export default GraphCanvas;
