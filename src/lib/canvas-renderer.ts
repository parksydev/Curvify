import type { CoordMode, GraphObject, ViewOptions, ViewState } from './types';
import * as Coords from './coords';
import {
  calculateStep,
  getVisibleBounds,
  numericDerivative,
  toMathCoord,
  toPixelCoord,
} from './transform';

export interface DrawContext {
  view: ViewState;
  coordMode: CoordMode;
  viewOptions: ViewOptions;
  objects: GraphObject[];
  selectedId: string | null;
  cartesianPreview?: { x: number; y: number }[];
  polarPreview?: { x: number; y: number }[];
  analysisTargetId?: string | null;
}

export function drawScene(ctx: CanvasRenderingContext2D, dc: DrawContext) {
  const { view } = dc;
  const w = view.canvasWidth;
  const h = view.canvasHeight;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  if (dc.viewOptions.showGrid) {
    if (dc.coordMode === 'polar') drawPolarGrid(ctx, dc);
    else drawCartesianGrid(ctx, dc);
  }
  if (dc.viewOptions.showAxes) {
    if (dc.coordMode === 'polar') drawPolarAxes(ctx, dc);
    else drawCartesianAxes(ctx, dc);
  }

  if (dc.viewOptions.showIntegral && dc.analysisTargetId) {
    drawIntegralShading(ctx, dc);
  }

  for (const obj of dc.objects) {
    if (obj.visible === false) continue;
    const selected = obj.id === dc.selectedId;
    switch (obj.type) {
      case 'function-sketch':
        drawCartesianPath(ctx, dc, obj.points, obj.color, selected, 2, [6, 3]);
        if (dc.viewOptions.showSketchOverlay && obj.equation?.evaluate) {
          drawSketchFitOverlay(ctx, dc, obj.minX, obj.maxX, obj.equation.evaluate, obj.color);
        }
        break;
      case 'function-explicit':
        if (obj.evaluate) drawExplicitCartesian(ctx, dc, obj.evaluate, obj.color, selected);
        break;
      case 'polar-sketch': {
        const cart = obj.polarPoints.map((p) => Coords.polarPointToCartesian(p));
        drawCartesianPath(ctx, dc, cart, obj.color, selected, 2, [6, 3]);
        if (dc.viewOptions.showSketchOverlay && obj.equation?.evaluate) {
          drawPolarFitOverlay(ctx, dc, obj.minTheta, obj.maxTheta, obj.equation.evaluate, obj.color);
        }
        break;
      }
      case 'polar-explicit':
        if (obj.evaluate) drawExplicitPolar(ctx, dc, obj.evaluate, obj.color, selected);
        break;
      case 'point':
        drawPoint(ctx, dc, obj, selected);
        break;
    }
  }

  if (dc.viewOptions.showDerivative && dc.analysisTargetId) {
    drawDerivativeOverlay(ctx, dc);
  }

  if (dc.cartesianPreview?.length) {
    drawCartesianPath(ctx, dc, dc.cartesianPreview, '#3b82f6', false, 2.5, [6, 4]);
  }
  if (dc.polarPreview?.length) {
    drawCartesianPath(ctx, dc, dc.polarPreview, '#7c3aed', false, 2.5, [6, 4]);
  }
}

function drawCartesianGrid(ctx: CanvasRenderingContext2D, dc: DrawContext) {
  const { view } = dc;
  const w = view.canvasWidth;
  const h = view.canvasHeight;
  const majorStep = calculateStep(view.unitScale);
  const minorStep = majorStep / 5;
  const { minX, maxX, minY, maxY } = getVisibleBounds(view);

  ctx.beginPath();
  ctx.strokeStyle = '#f0f0f0';
  ctx.lineWidth = 1;
  for (let x = Math.floor(minX / minorStep) * minorStep; x <= maxX; x += minorStep) {
    const px = toPixelCoord(view, x, 0).x;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
  }
  for (let y = Math.floor(minY / minorStep) * minorStep; y <= maxY; y += minorStep) {
    const py = toPixelCoord(view, 0, y).y;
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = '#e0e0e0';
  for (let x = Math.floor(minX / majorStep) * majorStep; x <= maxX; x += majorStep) {
    const px = toPixelCoord(view, x, 0).x;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
  }
  for (let y = Math.floor(minY / majorStep) * majorStep; y <= maxY; y += majorStep) {
    const py = toPixelCoord(view, 0, y).y;
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
  }
  ctx.stroke();
}

function drawPolarGrid(ctx: CanvasRenderingContext2D, dc: DrawContext) {
  const { view } = dc;
  const origin = toPixelCoord(view, 0, 0);
  const rStep = calculateStep(view.unitScale);
  const minorR = rStep / 5;
  const { minX, maxX, minY, maxY } = getVisibleBounds(view);
  const maxR =
    Math.max(
      Math.hypot(minX, minY),
      Math.hypot(maxX, minY),
      Math.hypot(minX, maxY),
      Math.hypot(maxX, maxY)
    ) + rStep;

  for (let r = minorR; r <= maxR; r += minorR) {
    const px = r * view.unitScale;
    if (px < 8) continue;
    ctx.beginPath();
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    ctx.arc(origin.x, origin.y, px, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let r = rStep; r <= maxR; r += rStep) {
    const px = r * view.unitScale;
    ctx.beginPath();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.arc(origin.x, origin.y, px, 0, Math.PI * 2);
    ctx.stroke();
  }

  const angleStep = calculateAngleStep(view.unitScale);
  for (let a = 0; a < Math.PI * 2; a += angleStep / 2) {
    const end = Coords.polarToPixel(view, maxR, a);
    ctx.beginPath();
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
  for (let a = 0; a < Math.PI * 2; a += angleStep) {
    const end = Coords.polarToPixel(view, maxR, a);
    ctx.beginPath();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
}

function calculateAngleStep(unitScale: number) {
  const targetPx = 70;
  const raw = targetPx / unitScale;
  const nice = [Math.PI / 12, Math.PI / 8, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2];
  for (const n of nice) {
    if (n >= raw * 0.85) return n;
  }
  return Math.PI / 2;
}

function drawCartesianAxes(ctx: CanvasRenderingContext2D, dc: DrawContext) {
  const { view } = dc;
  const w = view.canvasWidth;
  const h = view.canvasHeight;
  const origin = toPixelCoord(view, 0, 0);
  const majorStep = calculateStep(view.unitScale);
  const precision = Math.max(0, -Math.floor(Math.log10(majorStep)));
  const { minX, maxX, minY, maxY } = getVisibleBounds(view);

  ctx.beginPath();
  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 1.5;
  if (origin.y >= 0 && origin.y <= h) {
    ctx.moveTo(0, origin.y);
    ctx.lineTo(w, origin.y);
  }
  if (origin.x >= 0 && origin.x <= w) {
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, h);
  }
  ctx.stroke();

  ctx.fillStyle = '#666666';
  ctx.font = '11px "Source Sans 3", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = Math.ceil(minX / majorStep); i <= Math.floor(maxX / majorStep); i++) {
    if (i === 0) continue;
    const val = i * majorStep;
    const px = toPixelCoord(view, val, 0).x;
    if (px < 12 || px > w - 12) continue;
    ctx.fillText(val.toFixed(precision), px, Math.min(Math.max(origin.y + 6, 12), h - 4));
  }
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = Math.ceil(minY / majorStep); i <= Math.floor(maxY / majorStep); i++) {
    if (i === 0) continue;
    const val = i * majorStep;
    const py = toPixelCoord(view, 0, val).y;
    if (py < 12 || py > h - 12) continue;
    ctx.fillText(val.toFixed(precision), Math.min(Math.max(origin.x - 6, 24), w - 4), py);
  }
}

function drawPolarAxes(ctx: CanvasRenderingContext2D, dc: DrawContext) {
  const { view } = dc;
  const w = view.canvasWidth;
  const h = view.canvasHeight;
  const origin = toPixelCoord(view, 0, 0);
  const rStep = calculateStep(view.unitScale);
  const { minX, maxX, minY, maxY } = getVisibleBounds(view);
  const maxR =
    Math.max(
      Math.hypot(minX, minY),
      Math.hypot(maxX, minY),
      Math.hypot(minX, maxY),
      Math.hypot(maxX, maxY)
    ) + rStep;

  ctx.strokeStyle = '#888888';
  ctx.lineWidth = 1.5;
  const posX = Coords.polarToPixel(view, maxR * 1.02, 0);
  ctx.beginPath();
  ctx.moveTo(origin.x, origin.y);
  ctx.lineTo(posX.x, posX.y);
  ctx.stroke();

  const angleStep = calculateAngleStep(view.unitScale);
  for (let a = 0; a < Math.PI * 2; a += angleStep) {
    const end = Coords.polarToPixel(view, maxR, a);
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  }
}

function drawCartesianPath(
  ctx: CanvasRenderingContext2D,
  dc: DrawContext,
  points: { x: number; y: number }[],
  color: string,
  selected: boolean,
  width = 2.5,
  dash: number[] = []
) {
  if (!points || points.length < 2) return;
  const { view } = dc;
  ctx.beginPath();
  ctx.strokeStyle = color || '#2563eb';
  ctx.lineWidth = selected ? width + 1 : width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash(dash);
  const start = toPixelCoord(view, points[0].x, points[0].y);
  ctx.moveTo(start.x, start.y);
  for (let i = 1; i < points.length; i++) {
    const p = toPixelCoord(view, points[i].x, points[i].y);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  if (selected) {
    ctx.strokeStyle = 'rgba(74, 134, 199, 0.35)';
    ctx.lineWidth = width + 4;
    ctx.stroke();
  }
}

function drawExplicitCartesian(
  ctx: CanvasRenderingContext2D,
  dc: DrawContext,
  evaluate: (x: number) => number,
  color: string,
  selected: boolean
) {
  const { view } = dc;
  const { minX, maxX } = getVisibleBounds(view);
  const step = (maxX - minX) / Math.max(view.canvasWidth, 400);
  const pts: { x: number; y: number }[] = [];
  let lastValid: number | null = null;

  for (let x = minX; x <= maxX; x += step) {
    const y = evaluate(x);
    if (!Number.isFinite(y)) {
      if (pts.length >= 2) drawCartesianPath(ctx, dc, pts, color, selected);
      pts.length = 0;
      lastValid = null;
      continue;
    }
    if (lastValid !== null && Math.abs(y - lastValid) > 50) {
      if (pts.length >= 2) drawCartesianPath(ctx, dc, pts, color, selected);
      pts.length = 0;
    }
    pts.push({ x, y });
    lastValid = y;
  }
  if (pts.length >= 2) drawCartesianPath(ctx, dc, pts, color, selected);
}

function drawExplicitPolar(
  ctx: CanvasRenderingContext2D,
  dc: DrawContext,
  evaluate: (theta: number) => number,
  color: string,
  selected: boolean
) {
  const { view } = dc;
  const steps = Math.max(360, Math.floor(view.canvasWidth * 1.2));
  let segment: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    let r = evaluate(theta);
    if (!Number.isFinite(r)) {
      if (segment.length >= 2) drawCartesianPath(ctx, dc, segment, color, selected);
      segment = [];
      continue;
    }
    let t = theta;
    if (r < 0) {
      r = -r;
      t += Math.PI;
    }
    const cart = Coords.toCartesian(r, t);
    if (
      segment.length &&
      Math.hypot(cart.x - segment[segment.length - 1].x, cart.y - segment[segment.length - 1].y) > 8
    ) {
      drawCartesianPath(ctx, dc, segment, color, selected);
      segment = [];
    }
    segment.push(cart);
  }
  if (segment.length >= 2) drawCartesianPath(ctx, dc, segment, color, selected);
}

function drawSketchFitOverlay(
  ctx: CanvasRenderingContext2D,
  dc: DrawContext,
  minX: number,
  maxX: number,
  evaluate: (x: number) => number,
  color: string
) {
  const { view } = dc;
  const { minX: vbMin, maxX: vbMax } = getVisibleBounds(view);
  const lo = Math.max(minX, vbMin);
  const hi = Math.min(maxX, vbMax);
  if (lo >= hi) return;
  const step = (hi - lo) / 300;
  const pts: { x: number; y: number }[] = [];
  for (let x = lo; x <= hi; x += step) {
    const y = evaluate(x);
    if (Number.isFinite(y)) pts.push({ x, y });
  }
  if (pts.length >= 2) {
    ctx.globalAlpha = 0.85;
    drawCartesianPath(ctx, dc, pts, color, false, 2, []);
    ctx.globalAlpha = 1;
  }
}

function drawPolarFitOverlay(
  ctx: CanvasRenderingContext2D,
  dc: DrawContext,
  minTheta: number,
  maxTheta: number,
  evaluate: (t: number) => number,
  color: string
) {
  const steps = 200;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const theta = minTheta + ((maxTheta - minTheta) * i) / steps;
    const r = evaluate(theta);
    if (!Number.isFinite(r) || r < 0) continue;
    pts.push(Coords.toCartesian(r, theta));
  }
  if (pts.length >= 2) {
    ctx.globalAlpha = 0.85;
    drawCartesianPath(ctx, dc, pts, color, false, 2, []);
    ctx.globalAlpha = 1;
  }
}

function drawPoint(
  ctx: CanvasRenderingContext2D,
  dc: DrawContext,
  obj: Extract<GraphObject, { type: 'point' }>,
  selected: boolean
) {
  const p = toPixelCoord(dc.view, obj.x, obj.y);
  const r = selected ? 6 : 5;
  ctx.beginPath();
  ctx.fillStyle = obj.color || '#e11d48';
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = selected ? '#4a86c7' : '#fff';
  ctx.lineWidth = selected ? 2 : 1.5;
  ctx.stroke();
}

function getAnalysisFn(dc: DrawContext): ((x: number) => number) | null {
  const obj = dc.objects.find((o) => o.id === dc.analysisTargetId);
  if (!obj) return null;
  if (obj.type === 'function-explicit' && obj.evaluate) return obj.evaluate;
  if (obj.type === 'function-sketch' && obj.equation?.evaluate) return obj.equation.evaluate;
  return null;
}

function drawDerivativeOverlay(ctx: CanvasRenderingContext2D, dc: DrawContext) {
  const fn = getAnalysisFn(dc);
  if (!fn) return;
  const { view } = dc;
  const { minX, maxX } = getVisibleBounds(view);
  const step = (maxX - minX) / Math.max(view.canvasWidth, 400);
  const pts: { x: number; y: number }[] = [];
  for (let x = minX; x <= maxX; x += step) {
    const y = numericDerivative(fn, x);
    if (Number.isFinite(y)) pts.push({ x, y });
  }
  if (pts.length >= 2) {
    drawCartesianPath(ctx, dc, pts, '#dc2626', false, 2.75, [8, 5]);
  }
}

function drawIntegralShading(ctx: CanvasRenderingContext2D, dc: DrawContext) {
  const fn = getAnalysisFn(dc);
  if (!fn) return;
  const { view } = dc;
  const a = dc.viewOptions.integralFrom;
  const b = dc.viewOptions.integralTo;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const n = 160;
  const step = (hi - lo) / n;

  ctx.save();

  ctx.beginPath();
  const p0 = toPixelCoord(view, lo, 0);
  ctx.moveTo(p0.x, p0.y);
  for (let i = 0; i <= n; i++) {
    const x = lo + i * step;
    const y = fn(x);
    if (!Number.isFinite(y)) continue;
    const p = toPixelCoord(view, x, y);
    ctx.lineTo(p.x, p.y);
  }
  const pEnd = toPixelCoord(view, hi, 0);
  ctx.lineTo(pEnd.x, pEnd.y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(37, 99, 235, 0.28)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const originY = toPixelCoord(view, 0, 0).y;
  for (const xBound of [lo, hi]) {
    const px = toPixelCoord(view, xBound, 0).x;
    ctx.beginPath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.moveTo(px, 0);
    ctx.lineTo(px, view.canvasHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.font = '600 11px "Source Sans 3", sans-serif';
    ctx.fillStyle = '#1d4ed8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = Math.abs(xBound - Math.round(xBound)) < 1e-6 ? String(Math.round(xBound)) : xBound.toFixed(2);
    ctx.fillText(xBound === lo ? `a=${label}` : `b=${label}`, px, Math.min(originY + 6, view.canvasHeight - 18));
  }

  ctx.restore();
}

export function exportCanvasPng(canvas: HTMLCanvasElement) {
  return canvas.toDataURL('image/png');
}

export function exportCanvasSvg(canvas: HTMLCanvasElement): string {
  const w = canvas.width;
  const h = canvas.height;
  const dataUrl = canvas.toDataURL('image/png');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n<image href="${dataUrl}" width="${w}" height="${h}"/>\n</svg>`;
}

export function pickObjectAt(
  objects: GraphObject[],
  view: ViewState,
  mathX: number,
  mathY: number,
  thresholdMath = 0.35,
): GraphObject | null {
  let best: GraphObject | null = null;
  let bestDist = thresholdMath;

  for (const obj of objects) {
    if (obj.visible === false) continue;

    if (obj.type === 'point') {
      const d = Math.hypot(obj.x - mathX, obj.y - mathY);
      if (d < bestDist) {
        bestDist = d;
        best = obj;
      }
    } else if (obj.type === 'function-sketch' && obj.points?.length) {
      for (const p of obj.points) {
        const d = Math.hypot(p.x - mathX, p.y - mathY);
        if (d < bestDist) {
          bestDist = d;
          best = obj;
        }
      }
    } else if (obj.type === 'polar-sketch' && obj.polarPoints?.length) {
      for (const p of obj.polarPoints) {
        const c = Coords.polarPointToCartesian(p);
        const d = Math.hypot(c.x - mathX, c.y - mathY);
        if (d < bestDist) {
          bestDist = d;
          best = obj;
        }
      }
    } else if (obj.type === 'function-explicit' && obj.evaluate) {
      const y = obj.evaluate(mathX);
      if (Number.isFinite(y)) {
        const d = Math.abs(y - mathY);
        if (d < bestDist) {
          bestDist = d;
          best = obj;
        }
      }
    } else if (obj.type === 'polar-explicit' && obj.evaluate) {
      const { r: rClick, theta } = Coords.toPolar(mathX, mathY);
      void rClick;
      const rEval = obj.evaluate(theta);
      if (Number.isFinite(rEval)) {
        const c = Coords.polarPointToCartesian({ r: rEval, theta });
        const d = Math.hypot(c.x - mathX, c.y - mathY);
        if (d < bestDist) {
          bestDist = d;
          best = obj;
        }
      }
    }
  }
  return best;
}

export function pickFnValueAt(objects: GraphObject[], selectedId: string | null, x: number): number | null {
  if (!selectedId) return null;
  const obj = objects.find((o) => o.id === selectedId);
  if (!obj) return null;
  if (obj.type === 'function-explicit' && obj.evaluate) {
    const y = obj.evaluate(x);
    return Number.isFinite(y) ? y : null;
  }
  if (obj.type === 'function-sketch' && obj.equation?.evaluate) {
    const y = obj.equation.evaluate(x);
    return Number.isFinite(y) ? y : null;
  }
  return null;
}

export { toMathCoord, toPixelCoord, getVisibleBounds };
