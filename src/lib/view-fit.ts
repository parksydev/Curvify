import { polarPointToCartesian } from '@/lib/coords';
import { getVisibleBounds } from '@/lib/transform';
import type { GraphObject, ViewState } from '@/lib/types';

export function computeZoomFit(objects: GraphObject[], view: ViewState) {
  const canvasW = view.canvasWidth;
  const canvasH = view.canvasHeight;

  if (objects.length === 0) {
    return { panX: 0, panY: 0, unitScale: 50 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  const extend = (x: number, y: number) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  };

  for (const obj of objects) {
    if (obj.visible === false) continue;
    if (obj.type === 'function-sketch' && obj.points?.length) {
      obj.points.forEach((p) => extend(p.x, p.y));
    } else if (obj.type === 'polar-sketch' && obj.polarPoints?.length) {
      obj.polarPoints.forEach((p) => {
        const c = polarPointToCartesian(p);
        extend(c.x, c.y);
      });
    } else if (obj.type === 'point') {
      extend(obj.x, obj.y);
    } else if (obj.type === 'function-explicit' && obj.evaluate) {
      const vb = getVisibleBounds(view);
      for (let i = 0; i <= 200; i++) {
        const x = vb.minX + ((vb.maxX - vb.minX) * i) / 200;
        const y = obj.evaluate(x);
        if (Number.isFinite(y)) extend(x, y);
      }
    } else if (obj.type === 'polar-explicit' && obj.evaluate) {
      for (let i = 0; i <= 400; i++) {
        const theta = (i / 400) * Math.PI * 2;
        let r = obj.evaluate(theta);
        if (!Number.isFinite(r)) continue;
        let t = theta;
        if (r < 0) {
          r = -r;
          t += Math.PI;
        }
        extend(r * Math.cos(t), r * Math.sin(t));
      }
    }
  }

  if (!Number.isFinite(minX)) return null;

  const pad = 0.15;
  const rangeX = maxX - minX || 4;
  const rangeY = maxY - minY || 4;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const scaleX = (canvasW * (1 - pad)) / rangeX;
  const scaleY = (canvasH * (1 - pad)) / rangeY;

  return {
    panX: cx,
    panY: cy,
    unitScale: Math.min(scaleX, scaleY, 500),
  };
}
