import { describe, expect, it } from 'vitest';
import { fitPolynomial } from '@/engine/fit';
import cases from '../../fixtures/fit-cases.json';

describe('fitPolynomial', () => {
  it('fits linear data (golden)', () => {
    const c = cases.linear;
    const result = fitPolynomial(c.points, 1);
    expect(result).not.toBeNull();
    for (let i = 0; i < c.expectedCoeffs.length; i++) {
      expect(result!.coeffs[i]).toBeCloseTo(c.expectedCoeffs[i], 2);
    }
  });

  it('fits quadratic data (golden)', () => {
    const c = cases.quadratic;
    const result = fitPolynomial(c.points, 2);
    expect(result).not.toBeNull();
    for (let i = 0; i < c.expectedCoeffs.length; i++) {
      expect(result!.coeffs[i]).toBeCloseTo(c.expectedCoeffs[i], 1);
    }
  });
});
