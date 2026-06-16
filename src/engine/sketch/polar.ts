import type { PolarPoint } from '../types';
import { unwrapTheta } from '../geometry/polar';
import { cubicBezierBridge } from './bezier';
import type { PolarStrokeState } from './types';

export interface PolarSketchSlice {
  id: string;
  polarPoints: PolarPoint[];
  minTheta: number;
  maxTheta: number;
}

function cubicBezierPolar(
  pA: PolarPoint,
  pB: PolarPoint,
  toPixel: (r: number, t: number) => { x: number; y: number },
): PolarPoint[] {
  const a = { x: pA.theta, y: pA.r };
  const b = { x: pB.theta, y: pB.r };
  const bridged = cubicBezierBridge(a, b, (x, y) => toPixel(y, x));
  return bridged.map((p) => ({ theta: p.x, r: p.y }));
}

export function addPolarSample(
  stroke: PolarStrokeState,
  rawTheta: number,
  r: number,
): { stroke: PolarStrokeState; error?: string; ok: boolean } {
  const theta =
    stroke.lastValidTheta === null ? rawTheta : unwrapTheta(stroke.lastValidTheta, rawTheta);

  let direction = stroke.strokeDirection;
  if (direction === 0 && stroke.lastValidTheta !== null) {
    direction = theta > stroke.lastValidTheta ? 1 : -1;
  }

  if (stroke.lastValidTheta !== null) {
    if (
      (direction === 1 && theta < stroke.lastValidTheta) ||
      (direction === -1 && theta > stroke.lastValidTheta)
    ) {
      return { stroke, error: 'θ는 한 방향으로만 증가(또는 감소)해야 합니다.', ok: false };
    }
  }

  if (r < 0) return { stroke, error: '반지름 r은 0 이상이어야 합니다.', ok: false };

  return {
    stroke: {
      ...stroke,
      strokeDirection: direction,
      currentStroke: [...stroke.currentStroke, { theta, r }],
      lastValidTheta: theta,
      lastRawTheta: rawTheta,
    },
    ok: true,
  };
}

export function mergePolarStroke(
  stroke: PolarStrokeState,
  sketch: PolarSketchSlice | null,
  toPixel: (r: number, t: number) => { x: number; y: number },
): {
  ok: boolean;
  polarPoints?: PolarPoint[];
  minTheta?: number;
  maxTheta?: number;
  error?: string;
  info?: string;
} {
  if (!stroke.isDrawing) return { ok: false };
  if (stroke.currentStroke.length < 2) {
    return { ok: false, error: '점만 찍을 수는 없습니다. 곡선을 이어서 그려주세요.' };
  }

  let current = [...stroke.currentStroke];
  if (current[0].theta > current[current.length - 1].theta) current.reverse();

  if (!sketch || sketch.polarPoints.length === 0) {
    return {
      ok: true,
      polarPoints: current,
      minTheta: current[0].theta,
      maxTheta: current[current.length - 1].theta,
    };
  }

  const left = sketch.polarPoints[0].theta;
  const right = sketch.polarPoints[sketch.polarPoints.length - 1].theta;

  if (current[current.length - 1].theta <= left) {
    const bez = cubicBezierPolar(current[current.length - 1], sketch.polarPoints[0], toPixel);
    const polarPoints = [...current, ...bez, ...sketch.polarPoints];
    return {
      ok: true,
      polarPoints,
      minTheta: polarPoints[0].theta,
      maxTheta: polarPoints[polarPoints.length - 1].theta,
      info: '베지어 곡선으로 θ 구간을 부드럽게 연결했습니다.',
    };
  }

  if (current[0].theta >= right) {
    const bez = cubicBezierPolar(
      sketch.polarPoints[sketch.polarPoints.length - 1],
      current[0],
      toPixel,
    );
    const polarPoints = [...sketch.polarPoints, ...bez, ...current];
    return {
      ok: true,
      polarPoints,
      minTheta: polarPoints[0].theta,
      maxTheta: polarPoints[polarPoints.length - 1].theta,
      info: '베지어 곡선으로 θ 구간을 부드럽게 연결했습니다.',
    };
  }

  return {
    ok: false,
    error: '새 구간은 기존 곡선의 θ 범위 앞뒤에만 이을 수 있습니다.',
  };
}
