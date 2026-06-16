import { describe, expect, it } from 'vitest';
import { projectMonotonicX } from '@/engine/geometry/monotonic';

describe('projectMonotonicX', () => {
  it('collapses vertical jitter to one y per x-bin', () => {
    const noisy = [
      { x: 0, y: 0 },
      { x: 0.01, y: 0.5 },
      { x: 0.02, y: -0.3 },
      { x: 1, y: 2 },
      { x: 1.01, y: 2.4 },
      { x: 1.02, y: 1.8 },
      { x: 2, y: 4 },
    ];
    const projected = projectMonotonicX(noisy, { binCount: 3 });
    expect(projected.length).toBe(3);
    for (let i = 1; i < projected.length; i++) {
      expect(projected[i].x).toBeGreaterThan(projected[i - 1].x);
    }
    expect(projected[0].y).toBeCloseTo(0, 0);
    expect(projected[2].y).toBeCloseTo(4, 0);
  });

  it('sorts non-monotonic x input', () => {
    const pts = [
      { x: 2, y: 4 },
      { x: 0, y: 0 },
      { x: 1, y: 2 },
    ];
    const projected = projectMonotonicX(pts, { binCount: 3 });
    expect(projected[0].x).toBeLessThan(projected[1].x);
    expect(projected[1].x).toBeLessThan(projected[2].x);
  });
});
