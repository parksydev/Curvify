import { describe, expect, it } from 'vitest';
import { fitPolynomial } from '@/engine/fit';

/** Equally spaced nodes on [0,1] — high-degree Vandermonde is ill-conditioned. */
function makeEquispaced(n: number, fn: (x: number) => number) {
  return Array.from({ length: n }, (_, i) => {
    const x = i / (n - 1);
    return { x, y: fn(x) };
  });
}

describe('fitPolynomial Phase 1', () => {
  it('autoDegree picks quadratic for parabola among noise of high degree', () => {
    const points = makeEquispaced(12, (x) => x * x);
    const fit = fitPolynomial(points, 6, { autoDegree: true });
    expect(fit).not.toBeNull();
    expect(fit!.degree).toBeLessThanOrEqual(3);
    expect(fit!.evaluate(0.5)).toBeCloseTo(0.25, 2);
  });

  it('scaled QR improves stability vs wide x range', () => {
    const points = [
      { x: 100, y: 1 },
      { x: 110, y: 3 },
      { x: 120, y: 5 },
      { x: 130, y: 7 },
    ];
    const fit = fitPolynomial(points, 1);
    expect(fit).not.toBeNull();
    expect(fit!.coeffs[0]).toBeCloseTo(-19, 0);
    expect(fit!.coeffs[1]).toBeCloseTo(0.2, 2);
    expect(fit!.diagnostics.conditionNumber).toBeLessThan(1e6);
  });

  it('reports warning for high condition number', () => {
    const points = makeEquispaced(8, (x) => Math.sin(x * 10));
    const fit = fitPolynomial(points, 7);
    expect(fit).not.toBeNull();
    if (fit!.diagnostics.conditionNumber > 1e8) {
      expect(fit!.diagnostics.warning).toBeDefined();
    }
  });
});
