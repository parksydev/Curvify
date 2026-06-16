import { describe, expect, it } from 'vitest';
import { leastSquares, solveSquare } from '@/engine/numeric';

describe('leastSquares (Householder QR)', () => {
  it('fits overdetermined line y = 2x + 1', () => {
    const A = [
      [1, 0],
      [1, 1],
      [1, 2],
      [1, 3],
    ];
    const b = [1, 3, 5, 7];
    const result = leastSquares(A, b);
    expect(result).not.toBeNull();
    expect(result!.coeffs[0]).toBeCloseTo(1, 5);
    expect(result!.coeffs[1]).toBeCloseTo(2, 5);
    expect(result!.conditionEstimate).toBeLessThan(100);
  });

  it('matches square solveLinear for 2×2', () => {
    const A = [
      [2, 1],
      [1, 3],
    ];
    const b = [5, 7];
    const qr = leastSquares(A, b);
    const sq = solveSquare(A, b);
    expect(qr!.coeffs[0]).toBeCloseTo(sq![0], 8);
    expect(qr!.coeffs[1]).toBeCloseTo(sq![1], 8);
  });

  it('handles rank-deficient column gracefully', () => {
    const A = [
      [1, 1],
      [1, 1],
      [1, 1],
    ];
    const b = [2, 2, 2];
    const result = leastSquares(A, b);
    expect(result).not.toBeNull();
  });
});
