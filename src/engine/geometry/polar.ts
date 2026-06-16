import type { MathPoint, PolarPoint } from '../types';

export function toPolar(x: number, y: number): PolarPoint {
  return { r: Math.hypot(x, y), theta: Math.atan2(y, x) };
}

export function toCartesian(r: number, theta: number): MathPoint {
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
}

export function polarPointToCartesian(p: PolarPoint): MathPoint {
  return toCartesian(p.r, p.theta);
}

/** Unwrap θ so consecutive samples stay continuous (no 2π jumps). */
export function unwrapTheta(prev: number | null, theta: number): number {
  if (prev === null) return theta;
  let d = theta - prev;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return prev + d;
}
