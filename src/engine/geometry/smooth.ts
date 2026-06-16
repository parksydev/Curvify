import type { MathPoint } from '../types';

export interface SmoothOptions {
  /** Odd window size ≥ 3. Default 5. */
  windowSize?: number;
  /** Savitzky–Golay polynomial order (≤ windowSize − 1). Default 2. */
  polyOrder?: number;
}

/** SG quadratic smoothing coefficients for common odd windows. */
const SG_KERNELS: Record<number, number[]> = {
  5: [-3, 12, 17, 12, -3].map((v) => v / 35),
  7: [-2, 3, 6, 7, 6, 3, -2].map((v) => v / 21),
  9: [-21, 14, 39, 54, 59, 54, 39, 14, -21].map((v) => v / 231),
};

/**
 * Savitzky–Golay smooth of y-values; x unchanged.
 * Endpoints use progressively smaller valid windows.
 */
export function savitzkyGolay(points: MathPoint[], options: SmoothOptions = {}): MathPoint[] {
  const n = points.length;
  if (n < 3) return points.map((p) => ({ ...p }));

  let window = options.windowSize ?? 5;
  if (window % 2 === 0) window += 1;
  window = Math.min(window, n % 2 === 0 ? n - 1 : n);
  if (window < 3) return points.map((p) => ({ ...p }));

  const kernel = SG_KERNELS[window];
  if (!kernel) {
    return movingAverage(points, window);
  }

  const half = Math.floor(window / 2);
  const out: MathPoint[] = [];

  for (let i = 0; i < n; i++) {
    if (i < half || i >= n - half) {
      out.push({ ...points[i] });
      continue;
    }
    let y = 0;
    for (let k = 0; k < window; k++) {
      y += kernel[k] * points[i - half + k].y;
    }
    out.push({ x: points[i].x, y });
  }

  return out;
}

/** Fallback uniform moving average. */
export function movingAverage(points: MathPoint[], windowSize: number): MathPoint[] {
  const n = points.length;
  if (n < 2 || windowSize < 2) return points.map((p) => ({ ...p }));

  const half = Math.floor(windowSize / 2);
  const out: MathPoint[] = [];

  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    let sum = 0;
    let count = 0;
    for (let j = lo; j <= hi; j++) {
      sum += points[j].y;
      count++;
    }
    out.push({ x: points[i].x, y: sum / count });
  }

  return out;
}

export function smoothPoints(points: MathPoint[], options: SmoothOptions = {}): MathPoint[] {
  return savitzkyGolay(points, options);
}
