import type { MathPoint } from '../types';
import { projectMonotonicTheta, projectMonotonicX } from '../geometry/monotonic';
import { samplePolyline, samplePolylineAdaptive } from '../geometry/sampling';
import { smoothPoints } from '../geometry/smooth';

export interface PreprocessOptions {
  /** x/θ bin count for monotonic projection. */
  binCount?: number;
  /** Apply Savitzky–Golay smoothing. Default true. */
  smooth?: boolean;
  smoothWindow?: number;
  /** Base resample step in math coordinates. */
  stepMath?: number;
  /** Use curvature-adaptive resampling. Default true. */
  adaptiveResample?: boolean;
}

export interface PreprocessResult {
  /** Final resampled points ready for fitting. */
  resampled: MathPoint[];
  /** Intermediate stages (for debugging / UI). */
  stages: {
    monotonic: MathPoint[];
    smoothed: MathPoint[];
  };
  metadata: {
    rawPointCount: number;
    monotonicPointCount: number;
    smoothedPointCount: number;
    resampledPointCount: number;
    smoothed: boolean;
  };
}

const DEFAULTS: Required<Omit<PreprocessOptions, 'binCount'>> & { binCount?: number } = {
  smooth: true,
  smoothWindow: 5,
  stepMath: 0.05,
  adaptiveResample: true,
};

export function preprocessCartesianStroke(
  rawPoints: MathPoint[],
  options: PreprocessOptions = {},
): PreprocessResult {
  const opts = { ...DEFAULTS, ...options };

  if (rawPoints.length === 0) {
    return emptyResult(0);
  }

  const monotonic = projectMonotonicX(rawPoints, { binCount: opts.binCount });
  const smoothed = opts.smooth
    ? smoothPoints(monotonic, { windowSize: opts.smoothWindow })
    : monotonic;

  const resampled = opts.adaptiveResample
    ? samplePolylineAdaptive(smoothed, { stepMath: opts.stepMath })
    : samplePolyline(smoothed, opts.stepMath);

  return {
    resampled,
    stages: { monotonic, smoothed },
    metadata: {
      rawPointCount: rawPoints.length,
      monotonicPointCount: monotonic.length,
      smoothedPointCount: smoothed.length,
      resampledPointCount: resampled.length,
      smoothed: opts.smooth,
    },
  };
}

export function preprocessPolarStroke(
  rawPoints: MathPoint[],
  options: PreprocessOptions = {},
): PreprocessResult {
  const opts = { ...DEFAULTS, ...options };

  if (rawPoints.length === 0) return emptyResult(0);

  const monotonic = projectMonotonicTheta(rawPoints, { binCount: opts.binCount });
  const smoothed = opts.smooth
    ? smoothPoints(monotonic, { windowSize: opts.smoothWindow })
    : monotonic;

  const resampled = opts.adaptiveResample
    ? samplePolylineAdaptive(smoothed, { stepMath: opts.stepMath })
    : samplePolyline(smoothed, opts.stepMath);

  return {
    resampled,
    stages: { monotonic, smoothed },
    metadata: {
      rawPointCount: rawPoints.length,
      monotonicPointCount: monotonic.length,
      smoothedPointCount: smoothed.length,
      resampledPointCount: resampled.length,
      smoothed: opts.smooth,
    },
  };
}

function emptyResult(raw: number): PreprocessResult {
  return {
    resampled: [],
    stages: { monotonic: [], smoothed: [] },
    metadata: {
      rawPointCount: raw,
      monotonicPointCount: 0,
      smoothedPointCount: 0,
      resampledPointCount: 0,
      smoothed: false,
    },
  };
}
