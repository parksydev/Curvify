import { describe, expect, it } from 'vitest';
import { savitzkyGolay } from '@/engine/geometry/smooth';

describe('savitzkyGolay', () => {
  it('reduces noise on a line without large bias', () => {
    const line = Array.from({ length: 11 }, (_, i) => ({
      x: i,
      y: 2 * i + 1 + (i % 3 === 0 ? 0.4 : i % 3 === 1 ? -0.3 : 0.1),
    }));
    const smoothed = savitzkyGolay(line, { windowSize: 5 });
    expect(smoothed[5].y).toBeCloseTo(11, 0);
    const rawSpread = Math.max(...line.map((p) => p.y)) - Math.min(...line.map((p) => p.y));
    const mid = smoothed.slice(2, 9).map((p) => p.y);
    const smoothSpread = Math.max(...mid) - Math.min(...mid);
    expect(smoothSpread).toBeLessThan(rawSpread);
  });
});
