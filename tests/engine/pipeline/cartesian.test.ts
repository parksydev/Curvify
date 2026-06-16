import { describe, expect, it } from 'vitest';
import { pipelineCartesianSketch, strokeToFunctionData } from '@/engine/pipeline';

describe('pipeline/cartesian', () => {
  const stroke = [
    { x: 0, y: 0 },
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];

  it('strokeToFunctionData resamples and sets domain', () => {
    const data = strokeToFunctionData(stroke, 0.5);
    expect(data.domain.min).toBe(0);
    expect(data.domain.max).toBe(2);
    expect(data.domain.variable).toBe('x');
    expect(data.samples.length).toBeGreaterThan(stroke.length);
    expect(data.metadata.rawPointCount).toBe(3);
    expect(data.metadata.processedPointCount).toBeGreaterThan(0);
    expect(data.metadata.postprocess?.smoothed).toBe(true);
  });

  it('pipelineCartesianSketch produces linear fit for collinear data', () => {
    const { fit, data } = pipelineCartesianSketch(stroke, 'linear');
    expect(fit).not.toBeNull();
    expect(fit!.method).toBe('linear');
    expect(data.evaluate!(1)).toBeCloseTo(2, 1);
    expect(data.metadata.rSquared).toBeGreaterThan(0.99);
  });
});
