import { describe, expect, it } from 'vitest';
import { toPolar, toCartesian, unwrapTheta } from '@/engine/geometry';

describe('geometry/polar', () => {
  it('round-trips cartesian ↔ polar', () => {
    const p = toPolar(3, 4);
    expect(p.r).toBeCloseTo(5, 5);
    const c = toCartesian(p.r, p.theta);
    expect(c.x).toBeCloseTo(3, 5);
    expect(c.y).toBeCloseTo(4, 5);
  });

  it('unwraps theta across branch cut', () => {
    const a = Math.PI - 0.1;
    const b = -Math.PI + 0.1;
    expect(unwrapTheta(a, b)).toBeCloseTo(a + 0.2, 5);
  });
});
