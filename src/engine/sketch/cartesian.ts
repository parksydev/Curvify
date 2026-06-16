import type { MathPoint } from '../types';
import { cubicBezierBridge } from './bezier';
import type { CartesianStrokeState } from './types';

export interface CartesianSketchSlice {
  id: string;
  points: MathPoint[];
  minX: number;
  maxX: number;
}

export function cartesianPointerDown(
  stroke: CartesianStrokeState,
  sketch: CartesianSketchSlice | null,
  mathPos: MathPoint,
): { stroke: CartesianStrokeState; error?: string } {
  if (sketch && mathPos.x >= sketch.minX && mathPos.x <= sketch.maxX) {
    return { stroke, error: '이미 그래프가 그려진 X 구간입니다.' };
  }
  return {
    stroke: {
      ...stroke,
      isDrawing: true,
      strokeDirection: 0,
      currentStroke: [mathPos],
      lastValidX: mathPos.x,
    },
  };
}

export function cartesianPointerMove(
  stroke: CartesianStrokeState,
  sketch: CartesianSketchSlice | null,
  mathPos: MathPoint,
): { stroke: CartesianStrokeState; error?: string; finish?: boolean } {
  if (!stroke.isDrawing || stroke.lastValidX === null) return { stroke };
  if (mathPos.x === stroke.lastValidX) return { stroke };

  let direction = stroke.strokeDirection;
  if (direction === 0) direction = mathPos.x > stroke.lastValidX ? 1 : -1;

  if (
    (direction === 1 && mathPos.x < stroke.lastValidX) ||
    (direction === -1 && mathPos.x > stroke.lastValidX)
  ) {
    return { stroke, error: '함수는 한 방향으로만 진행되어야 합니다.' };
  }

  if (sketch) {
    const minX = Math.min(stroke.lastValidX, mathPos.x);
    const maxX = Math.max(stroke.lastValidX, mathPos.x);
    if (Math.max(minX, sketch.minX) <= Math.min(maxX, sketch.maxX)) {
      return { stroke, finish: true, error: '기존 그래프와 겹칠 수 없습니다.' };
    }
  }

  return {
    stroke: {
      ...stroke,
      strokeDirection: direction,
      currentStroke: [...stroke.currentStroke, mathPos],
      lastValidX: mathPos.x,
    },
  };
}

export function mergeCartesianStroke(
  stroke: CartesianStrokeState,
  sketch: CartesianSketchSlice | null,
  toPixel: (x: number, y: number) => { x: number; y: number },
): {
  ok: boolean;
  points?: MathPoint[];
  minX?: number;
  maxX?: number;
  error?: string;
  info?: string;
} {
  if (!stroke.isDrawing) return { ok: false };
  if (stroke.currentStroke.length < 2) {
    return { ok: false, error: '점만 찍을 수는 없습니다. 선을 이어서 그려주세요.' };
  }

  let current = [...stroke.currentStroke];
  if (current[0].x > current[current.length - 1].x) current.reverse();

  if (!sketch || sketch.points.length === 0) {
    return {
      ok: true,
      points: current,
      minX: current[0].x,
      maxX: current[current.length - 1].x,
    };
  }

  const leftEdge = sketch.points[0].x;
  const rightEdge = sketch.points[sketch.points.length - 1].x;

  if (current[current.length - 1].x <= leftEdge) {
    const bez = cubicBezierBridge(current[current.length - 1], sketch.points[0], toPixel);
    const points = [...current, ...bez, ...sketch.points];
    return {
      ok: true,
      points,
      minX: points[0].x,
      maxX: points[points.length - 1].x,
      info: '베지어 곡선으로 구간을 부드럽게 연결했습니다.',
    };
  }

  if (current[0].x >= rightEdge) {
    const bez = cubicBezierBridge(sketch.points[sketch.points.length - 1], current[0], toPixel);
    const points = [...sketch.points, ...bez, ...current];
    return {
      ok: true,
      points,
      minX: points[0].x,
      maxX: points[points.length - 1].x,
      info: '베지어 곡선으로 구간을 부드럽게 연결했습니다.',
    };
  }

  return {
    ok: false,
    error: '새 구간은 기존 그래프의 왼쪽 또는 오른쪽에만 이을 수 있습니다.',
  };
}
