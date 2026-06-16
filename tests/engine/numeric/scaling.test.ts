import { describe, expect, it } from 'vitest';
import {
  abscissaScale,
  evalScaledPoly,
  scaledPolyToPowerBasis,
} from '@/engine/numeric';

describe('numeric/scaling', () => {
  it('scaled ↔ power basis round-trip for linear', () => {
    const scaled = [1, 2];
    const { shift, scale } = { shift: 0, scale: 1 };
    const power = scaledPolyToPowerBasis(scaled, shift, scale);
    expect(power[0]).toBeCloseTo(1, 8);
    expect(power[1]).toBeCloseTo(2, 8);
    expect(evalScaledPoly(3, scaled, shift, scale)).toBeCloseTo(7, 8);
  });

  it('maps wide x range to [-1,1] center', () => {
    const xs = [0, 10, 20];
    const { shift, scale } = abscissaScale(xs);
    expect(shift).toBe(10);
    expect(scale).toBe(10);
  });
});
