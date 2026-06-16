import type { MathPoint } from '../types';

export interface MonotonicOptions {
  /** Number of x-bins; default derived from point count. */
  binCount?: number;
  /** Aggregation per bin. */
  strategy?: 'median' | 'mean';
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

function aggregate(values: number[], strategy: 'median' | 'mean'): number {
  if (strategy === 'median') return median(values);
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Project a noisy polyline onto y = f(x): one y per x-bin (median/mean).
 * Input need not be strictly monotonic in x.
 */
export function projectMonotonicX(
  points: MathPoint[],
  options: MonotonicOptions = {},
): MathPoint[] {
  if (points.length < 2) return points.map((p) => ({ ...p }));

  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const xMin = sorted[0].x;
  const xMax = sorted[sorted.length - 1].x;
  const range = xMax - xMin;

  if (range < 1e-12) {
    const ys = sorted.map((p) => p.y);
    return [{ x: xMin, y: aggregate(ys, options.strategy ?? 'median') }];
  }

  const binCount =
    options.binCount ??
    Math.min(500, Math.max(16, Math.floor(Math.sqrt(sorted.length) * 4)));
  const binWidth = range / binCount;
  const strategy = options.strategy ?? 'median';

  const bins: MathPoint[][] = Array.from({ length: binCount }, () => []);
  for (const p of sorted) {
    let idx = Math.floor((p.x - xMin) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].push(p);
  }

  const result: MathPoint[] = [];
  for (let i = 0; i < binCount; i++) {
    const bin = bins[i];
    if (!bin.length) continue;
    const x = xMin + (i + 0.5) * binWidth;
    const ys = bin.map((p) => p.y);
    result.push({ x, y: aggregate(ys, strategy) });
  }

  if (result.length < 2) return sorted;
  return result;
}

/** Polar counterpart: r = g(θ), bin by θ. */
export function projectMonotonicTheta(
  points: MathPoint[],
  options: MonotonicOptions = {},
): MathPoint[] {
  return projectMonotonicX(points, options);
}
