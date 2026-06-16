import type { MathPoint } from '../types';

export function cubicBezierBridge(
  pA: MathPoint,
  pB: MathPoint,
  toPixel: (x: number, y: number) => { x: number; y: number },
): MathPoint[] {
  if (Math.abs(pA.x - pB.x) < 0.0001) return [];
  const pxA = toPixel(pA.x, pA.y);
  const pxB = toPixel(pB.x, pB.y);
  const dist = Math.hypot(pxB.x - pxA.x, pxB.y - pxA.y);
  const numPoints = Math.max(10, Math.min(200, Math.floor(dist / 2)));
  const dx = pB.x - pA.x;
  const cp1 = { x: pA.x + dx / 2, y: pA.y };
  const cp2 = { x: pB.x - dx / 2, y: pB.y };
  const points: MathPoint[] = [];
  for (let i = 1; i <= numPoints; i++) {
    const t = i / (numPoints + 1);
    const u = 1 - t;
    points.push({
      x: u ** 3 * pA.x + 3 * u ** 2 * t * cp1.x + 3 * u * t ** 2 * cp2.x + t ** 3 * pB.x,
      y: u ** 3 * pA.y + 3 * u ** 2 * t * cp1.y + 3 * u * t ** 2 * cp2.y + t ** 3 * pB.y,
    });
  }
  return points;
}
