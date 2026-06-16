import type { MathPoint } from '../types';

/** Uniform resampling along polyline segments in math coordinates. */
export function samplePolyline(points: MathPoint[], stepMath = 0.05): MathPoint[] {
  if (!points || points.length < 2) return [];
  const samples: MathPoint[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    appendSegmentSamples(samples, points[i], points[i + 1], stepMath);
  }
  return samples;
}

export interface AdaptiveSampleOptions {
  /** Base step in math units. */
  stepMath?: number;
  /** Finer step where curvature is high. */
  stepFine?: number;
  /** Turn angle (rad) above which to use stepFine. Default π/8. */
  angleThreshold?: number;
}

/**
 * Denser samples where the polyline bends; uniform elsewhere.
 */
export function samplePolylineAdaptive(
  points: MathPoint[],
  options: AdaptiveSampleOptions = {},
): MathPoint[] {
  if (!points || points.length < 2) return [];

  const stepMath = options.stepMath ?? 0.05;
  const stepFine = options.stepFine ?? stepMath / 2;
  const angleThreshold = options.angleThreshold ?? Math.PI / 8;

  const samples: MathPoint[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    let step = stepMath;

    if (i > 0) {
      const turn = turningAngle(points[i - 1], a, b);
      if (turn > angleThreshold) step = stepFine;
    }
    if (i + 2 < points.length) {
      const turn = turningAngle(a, b, points[i + 2]);
      if (turn > angleThreshold) step = Math.min(step, stepFine);
    }

    appendSegmentSamples(samples, a, b, step);
  }

  return samples;
}

function turningAngle(a: MathPoint, b: MathPoint, c: MathPoint): number {
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const m1 = Math.hypot(v1x, v1y);
  const m2 = Math.hypot(v2x, v2y);
  if (m1 < 1e-12 || m2 < 1e-12) return 0;
  const dot = (v1x * v2x + v1y * v2y) / (m1 * m2);
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

function appendSegmentSamples(
  out: MathPoint[],
  a: MathPoint,
  b: MathPoint,
  stepMath: number,
): void {
  const dist = Math.hypot(b.x - a.x, b.y - a.y);
  const steps = Math.max(2, Math.ceil(dist / stepMath));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
  }
}
