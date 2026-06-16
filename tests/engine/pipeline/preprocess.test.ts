import { describe, expect, it } from 'vitest';
import { preprocessCartesianStroke } from '@/engine/pipeline';
import { pipelineCartesianSketch } from '@/engine/pipeline';

describe('preprocess pipeline', () => {
  it('runs monotonic → smooth → resample stages', () => {
    const raw = [
      { x: 0, y: 0.1 },
      { x: 0.05, y: -0.1 },
      { x: 0.1, y: 0.05 },
      { x: 1, y: 2.1 },
      { x: 1.05, y: 1.9 },
      { x: 2, y: 4 },
    ];
    const result = preprocessCartesianStroke(raw);
    expect(result.stages.monotonic.length).toBeGreaterThan(0);
    expect(result.stages.smoothed.length).toBe(result.stages.monotonic.length);
    expect(result.resampled.length).toBeGreaterThan(result.stages.smoothed.length);
    expect(result.metadata.smoothed).toBe(true);
  });

  it('fits noisy stroke closer to y = 2x after preprocess', () => {
    const raw: { x: number; y: number }[] = [];
    for (let i = 0; i <= 20; i++) {
      const x = i * 0.1;
      const noise = Math.sin(i * 1.7) * 0.25;
      raw.push({ x, y: 2 * x + noise });
    }
    const { fit: withPre } = pipelineCartesianSketch(raw, 'linear');
    expect(withPre).not.toBeNull();
    expect(withPre!.coeffs![1]).toBeCloseTo(2, 0);
    expect(withPre!.rSquared).toBeGreaterThan(0.95);
  });
});
