import type { MathPoint } from '../types';

export interface PchipSpline {
  xs: number[];
  ys: number[];
  /** dy/dx at each knot. */
  ms: number[];
}

function dedupeSorted(points: MathPoint[]): MathPoint[] {
  const sorted = [...points].sort((a, b) => a.x - b.x);
  const out: MathPoint[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (last && Math.abs(p.x - last.x) < 1e-12) {
      last.y = (last.y + p.y) / 2;
    } else {
      out.push({ x: p.x, y: p.y });
    }
  }
  return out;
}

/** Fritsch–Carlson slopes for monotonic PCHIP. */
function pchipSlopes(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  const ms = new Array<number>(n);
  const delta = new Array<number>(n - 1);

  for (let i = 0; i < n - 1; i++) {
    const h = xs[i + 1] - xs[i];
    delta[i] = h > 1e-15 ? (ys[i + 1] - ys[i]) / h : 0;
  }

  if (n === 2) {
    ms[0] = delta[0];
    ms[1] = delta[0];
    return ms;
  }

  ms[0] = endSlope(xs[0], xs[1], xs[2], ys[0], ys[1], ys[2], delta[0], delta[1]);
  ms[n - 1] = endSlope(
    xs[n - 1],
    xs[n - 2],
    xs[n - 3],
    ys[n - 1],
    ys[n - 2],
    ys[n - 3],
    delta[n - 2],
    delta[n - 3],
  );

  for (let i = 1; i < n - 1; i++) {
    if (delta[i - 1] * delta[i] <= 0) {
      ms[i] = 0;
    } else {
      const h0 = xs[i] - xs[i - 1];
      const h1 = xs[i + 1] - xs[i];
      const w1 = 2 * h1 + h0;
      const w2 = h1 + 2 * h0;
      ms[i] = (w1 + w2) / (w1 / delta[i - 1] + w2 / delta[i]);
    }
  }

  return ms;
}

function endSlope(
  x0: number,
  x1: number,
  x2: number,
  y0: number,
  y1: number,
  y2: number,
  d0: number,
  d1: number,
): number {
  const h0 = x0 - x1;
  const h1 = x1 - x2;
  let m = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1);
  if (m * d0 <= 0) m = 0;
  else if (d0 * d1 <= 0 || Math.abs(m) > 3 * Math.abs(d0)) m = 3 * d0;
  return m;
}

export function buildPchip(points: MathPoint[]): PchipSpline | null {
  const nodes = dedupeSorted(points);
  if (nodes.length < 2) return null;
  const xs = nodes.map((p) => p.x);
  const ys = nodes.map((p) => p.y);
  return { xs, ys, ms: pchipSlopes(xs, ys) };
}

export function evalPchip(spline: PchipSpline, x: number): number {
  const { xs, ys, ms } = spline;
  const n = xs.length;
  if (n === 0) return NaN;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[n - 1]) return ys[n - 1];

  let lo = 0;
  let hi = n - 2;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (xs[mid] <= x) lo = mid;
    else hi = mid - 1;
  }

  const i = lo;
  const h = xs[i + 1] - xs[i];
  if (h < 1e-15) return ys[i];
  const t = (x - xs[i]) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  return h00 * ys[i] + h10 * h * ms[i] + h01 * ys[i + 1] + h11 * h * ms[i + 1];
}
