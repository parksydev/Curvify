import { describe, expect, it } from 'vitest';
import { rebuildEvaluate } from '@/engine/fit/model-data';
import { toFitPayload, fromFitPayload } from '@/engine/fit/serialize';
import { fitCartesian } from '@/engine/fit';

describe('fit serialize', () => {
  it('round-trips polynomial fit through payload', () => {
    const points = [
      { x: 0, y: 1 },
      { x: 1, y: 3 },
      { x: 2, y: 5 },
    ];
    const fit = fitCartesian(points, 'linear')!;
    const payload = toFitPayload(fit)!;
    const restored = fromFitPayload(payload);
    expect(restored.evaluate(1)).toBeCloseTo(3, 5);
    expect(rebuildEvaluate(payload.modelData)(2)).toBeCloseTo(5, 5);
  });
});
