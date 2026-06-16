import { fitCartesian, fitPolar } from '../fit';
import { preprocessCartesianStroke, preprocessPolarStroke, type PreprocessOptions } from './preprocess';
import type { FitEquationResult, FunctionData, MathPoint } from '../types';

export interface FitFunctionDataResult {
  data: FunctionData;
  fit: FitEquationResult | null;
}

export type { PreprocessOptions, PreprocessResult } from './preprocess';
export { preprocessCartesianStroke, preprocessPolarStroke } from './preprocess';

function domainFromRaw(points: MathPoint[]): { min: number; max: number } {
  const xs = points.map((p) => p.x);
  return { min: Math.min(...xs), max: Math.max(...xs) };
}

/** Stage 2: monotonic → smooth → adaptive resample. */
export function strokeToFunctionData(
  rawPoints: MathPoint[],
  stepMath = 0.05,
  preprocess: PreprocessOptions = {},
): FunctionData {
  if (rawPoints.length === 0) {
    return {
      domain: { min: 0, max: 0, variable: 'x' },
      samples: [],
      metadata: { source: 'sketch', rawPointCount: 0 },
    };
  }

  const { resampled, metadata } = preprocessCartesianStroke(rawPoints, {
    stepMath,
    ...preprocess,
  });
  const { min, max } = domainFromRaw(rawPoints);

  return {
    domain: { min, max, variable: 'x' },
    samples: resampled,
    metadata: {
      source: 'sketch',
      rawPointCount: metadata.rawPointCount,
      processedPointCount: metadata.resampledPointCount,
      postprocess: {
        monotonicPointCount: metadata.monotonicPointCount,
        smoothed: metadata.smoothed,
      },
    },
  };
}

/** Stage 3: fit samples to a closed-form model. */
export function fitFunctionData(
  data: FunctionData,
  method: string,
  isPolar = false,
): FitFunctionDataResult {
  const fit = isPolar ? fitPolar(data.samples, method) : fitCartesian(data.samples, method);
  return {
    fit,
    data: {
      ...data,
      evaluate: fit?.evaluate,
      metadata: {
        ...data.metadata,
        source: fit ? 'fit' : data.metadata.source,
        fitMethod: fit?.method ?? method,
        rSquared: fit?.rSquared,
      },
    },
  };
}

/** Full cartesian pipeline: raw stroke → preprocess → fit. */
export function pipelineCartesianSketch(
  rawPoints: MathPoint[],
  method: string,
  stepMath = 0.05,
  preprocess: PreprocessOptions = {},
): FitFunctionDataResult {
  const data = strokeToFunctionData(rawPoints, stepMath, preprocess);
  return fitFunctionData(data, method, false);
}

/** Full polar pipeline: (θ,r) → preprocess → fit. */
export function pipelinePolarSketch(
  polarSamples: MathPoint[],
  method: string,
  preprocess: PreprocessOptions = {},
): FitFunctionDataResult {
  if (polarSamples.length === 0) {
    return fitFunctionData(
      {
        domain: { min: 0, max: 0, variable: 'theta' },
        samples: [],
        metadata: { source: 'sketch', rawPointCount: 0 },
      },
      method,
      true,
    );
  }

  const { resampled, metadata } = preprocessPolarStroke(polarSamples, preprocess);
  const { min, max } = domainFromRaw(polarSamples);

  const data: FunctionData = {
    domain: { min, max, variable: 'theta' },
    samples: resampled,
    metadata: {
      source: 'sketch',
      rawPointCount: metadata.rawPointCount,
      processedPointCount: metadata.resampledPointCount,
      postprocess: {
        monotonicPointCount: metadata.monotonicPointCount,
        smoothed: metadata.smoothed,
      },
    },
  };
  return fitFunctionData(data, method, true);
}
