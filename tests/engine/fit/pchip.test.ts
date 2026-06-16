import { describe, expect, it } from 'vitest';
import { buildPchip, evalPchip } from '@/engine/fit/pchip';
import { fitCartesian } from '@/engine/fit';

describe('PCHIP spline', () => {
  const nodes = [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 0 },
    { x: 3, y: 1 },
  ];

  it('interpolates knots exactly', () => {
    const spline = buildPchip(nodes)!;
    for (const p of nodes) {
      expect(evalPchip(spline, p.x)).toBeCloseTo(p.y, 8);
    }
  });

  it('fits as cartesian method pchip', () => {
    const fit = fitCartesian(nodes, 'pchip');
    expect(fit).not.toBeNull();
    expect(fit!.method).toBe('pchip');
    expect(fit!.modelData?.type).toBe('pchip');
    expect(fit!.diagnostics?.knotCount).toBeGreaterThanOrEqual(4);
    expect(fit!.diagnostics?.rmse).toBeLessThan(1e-6);
  });
});
