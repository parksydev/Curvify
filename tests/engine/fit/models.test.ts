import { describe, expect, it } from 'vitest';
import { fitCartesian } from '@/engine/fit';
import cases from '../../fixtures/fit-cases.json';

describe('fitCartesian', () => {
  it('linear method matches golden coefficients', () => {
    const c = cases.linear;
    const fit = fitCartesian(c.points, c.method);
    expect(fit).not.toBeNull();
    expect(fit!.coeffs![0]).toBeCloseTo(c.expectedCoeffs[0], 2);
    expect(fit!.coeffs![1]).toBeCloseTo(c.expectedCoeffs[1], 2);
    expect(fit!.rSquared).toBeGreaterThan(0.99);
  });

  it('trigonometric method approximates sin(x)', () => {
    const c = cases.sine;
    const fit = fitCartesian(c.points, c.method);
    expect(fit).not.toBeNull();
    for (const check of c.checkAt) {
      expect(fit!.evaluate(check.x)).toBeCloseTo(check.expectedY, 1);
    }
  });
});
