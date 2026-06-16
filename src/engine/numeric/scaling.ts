/** Map x from [xMin, xMax] to [−1, 1] for stable polynomial bases. */
export function abscissaScale(xs: number[]): { shift: number; scale: number } {
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const shift = (xMin + xMax) / 2;
  const halfRange = (xMax - xMin) / 2;
  return { shift, scale: halfRange > 1e-12 ? halfRange : 1 };
}

export function toScaled(x: number, shift: number, scale: number): number {
  return (x - shift) / scale;
}

function binomial(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  k = Math.min(k, n - k);
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c;
}

/**
 * Convert p(t) = Σ aᵢ tⁱ, t = (x − shift) / scale, to standard power basis in x.
 */
export function scaledPolyToPowerBasis(
  scaledCoeffs: number[],
  shift: number,
  scale: number,
): number[] {
  const n = scaledCoeffs.length - 1;
  const power = new Array(n + 1).fill(0);

  for (let i = 0; i <= n; i++) {
    const a = scaledCoeffs[i];
    if (Math.abs(a) < 1e-15) continue;
    const inv = Math.pow(1 / scale, i);
    for (let k = 0; k <= i; k++) {
      power[k] += a * inv * binomial(i, k) * Math.pow(-shift, i - k);
    }
  }
  return power;
}

export function evalPowerPoly(x: number, coeffs: number[]): number {
  let y = 0;
  for (let i = coeffs.length - 1; i >= 0; i--) {
    y = y * x + coeffs[i];
  }
  return y;
}

export function evalScaledPoly(
  x: number,
  scaledCoeffs: number[],
  shift: number,
  scale: number,
): number {
  const t = toScaled(x, shift, scale);
  let y = 0;
  for (let i = scaledCoeffs.length - 1; i >= 0; i--) {
    y = y * t + scaledCoeffs[i];
  }
  return y;
}
