/** Central-difference numerical derivative f'(x). */
export function numericDerivative(fn: (x: number) => number, x: number, h = 1e-5): number {
  const y1 = fn(x - h);
  const y2 = fn(x + h);
  if (!Number.isFinite(y1) || !Number.isFinite(y2)) return NaN;
  return (y2 - y1) / (2 * h);
}

/** Trapezoidal samples for definite-integral shading. */
export function sampleDefiniteIntegral(
  fn: (x: number) => number,
  a: number,
  b: number,
  n = 200,
): { x: number; y0: number; y1: number }[] {
  if (a === b) return [];
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const step = (hi - lo) / n;
  const samples: { x: number; y0: number; y1: number }[] = [];
  for (let i = 0; i <= n; i++) {
    const x = lo + i * step;
    const y = fn(x);
    samples.push({ x, y0: 0, y1: Number.isFinite(y) ? y : 0 });
  }
  return samples;
}

/** Simpson's rule definite integral (Phase 1+ reference implementation). */
export function simpsonIntegral(fn: (x: number) => number, a: number, b: number, n = 200): number {
  if (a === b) return 0;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const evenN = n % 2 === 0 ? n : n + 1;
  const h = (hi - lo) / evenN;
  let sum = fn(lo) + fn(hi);
  for (let i = 1; i < evenN; i++) {
    const x = lo + i * h;
    const y = fn(x);
    if (!Number.isFinite(y)) return NaN;
    sum += y * (i % 2 === 0 ? 2 : 4);
  }
  return (h / 3) * sum;
}
