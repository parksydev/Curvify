import type { ViewState } from './types';
import { toPixelCoord } from './transform';
import type { MathPoint } from './types';

export {
  COEF_DISPLAY_EPS,
  fitPolynomial,
  leastSquaresPoly,
  solveLinear,
  formatPolynomial,
} from '@/engine/fit';

/** Pixel-space resampling for canvas overlay (view-dependent). */
export function sampleSketch(view: ViewState, points: MathPoint[], stepPx = 2) {
  if (!points || points.length < 2) return [];
  const samples: MathPoint[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const pa = toPixelCoord(view, a.x, a.y);
    const pb = toPixelCoord(view, b.x, b.y);
    const dist = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    const steps = Math.max(2, Math.ceil(dist / stepPx));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      samples.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
    }
  }
  return samples;
}
