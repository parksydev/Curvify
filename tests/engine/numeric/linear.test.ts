import { describe, expect, it } from 'vitest';
import { solveLinear } from '@/engine/numeric';

describe('solveLinear', () => {
  it('solves 2×2 system', () => {
    const x = solveLinear(
      [
        [2, 1],
        [1, 3],
      ],
      [5, 7],
    );
    expect(x).not.toBeNull();
    expect(x![0]).toBeCloseTo(1.6, 5);
    expect(x![1]).toBeCloseTo(1.8, 5);
  });

  it('returns null for singular matrix', () => {
    expect(solveLinear([[1, 1], [2, 2]], [3, 6])).toBeNull();
  });
});
