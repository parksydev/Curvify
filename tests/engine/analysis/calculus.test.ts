import { describe, expect, it } from 'vitest';
import { simpsonIntegral } from '@/engine/analysis';

describe('analysis/calculus', () => {
  it('integrates x² on [0,1] ≈ 1/3', () => {
    const v = simpsonIntegral((x) => x * x, 0, 1, 200);
    expect(v).toBeCloseTo(1 / 3, 4);
  });
});
