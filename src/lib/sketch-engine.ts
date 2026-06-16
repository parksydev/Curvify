import type { FunctionSketch, GraphObject, MathPoint, PolarSketch } from './types';
import {
  initialCartesianStroke,
  initialPolarStroke,
  cartesianPointerDown as enginePointerDown,
  cartesianPointerMove as enginePointerMove,
  mergeCartesianStroke,
  mergePolarStroke,
  addPolarSample,
  type CartesianStrokeState,
  type PolarStrokeState,
} from '@/engine/sketch';

export type { CartesianStrokeState, PolarStrokeState };
export { initialCartesianStroke, initialPolarStroke, addPolarSample };

export function finishCartesianStroke(
  stroke: CartesianStrokeState,
  objects: GraphObject[],
  toPixel: (x: number, y: number) => { x: number; y: number },
  nextFunctionName: () => string,
  generateId: () => string,
) {
  if (!stroke.isDrawing) return { objects, stroke, needsHistory: false };

  const newStroke = { ...stroke, isDrawing: false };
  let objs = [...objects];
  let sketch = objs.find(
    (o): o is FunctionSketch => o.type === 'function-sketch' && o.id === stroke.activeSketchId,
  );

  if (!sketch) {
    sketch = {
      id: generateId(),
      type: 'function-sketch',
      name: nextFunctionName(),
      points: [],
      minX: Infinity,
      maxX: -Infinity,
      color: '#2563eb',
      equation: null,
    };
    objs.push(sketch);
    newStroke.activeSketchId = sketch.id;
  }

  const merged = mergeCartesianStroke(stroke, sketch, toPixel);
  if (!merged.ok) {
    return {
      objects,
      stroke: { ...newStroke, currentStroke: [] },
      error: merged.error,
      needsHistory: false,
    };
  }

  sketch = {
    ...sketch,
    points: merged.points!,
    minX: merged.minX!,
    maxX: merged.maxX!,
    equation: null,
    equationDisplay: undefined,
    equationDisplayLatex: undefined,
  };
  objs = objs.map((o) => (o.id === sketch!.id ? sketch! : o));

  return {
    objects: objs,
    stroke: { ...newStroke, currentStroke: [], activeSketchId: sketch.id },
    sketchId: sketch.id,
    info: merged.info,
    needsHistory: true,
  };
}

export function cartesianPointerDown(
  stroke: CartesianStrokeState,
  objects: GraphObject[],
  mathPos: MathPoint,
) {
  const sketch = objects.find(
    (o): o is FunctionSketch => o.type === 'function-sketch' && o.id === stroke.activeSketchId,
  );
  return enginePointerDown(stroke, sketch ?? null, mathPos);
}

export function cartesianPointerMove(
  stroke: CartesianStrokeState,
  objects: GraphObject[],
  mathPos: MathPoint,
) {
  const sketch = objects.find(
    (o): o is FunctionSketch => o.type === 'function-sketch' && o.id === stroke.activeSketchId,
  );
  return enginePointerMove(stroke, sketch ?? null, mathPos);
}

export function finishPolarStroke(
  stroke: PolarStrokeState,
  objects: GraphObject[],
  toPixel: (r: number, t: number) => { x: number; y: number },
  nextFunctionName: () => string,
  generateId: () => string,
) {
  if (!stroke.isDrawing) return { objects, stroke, needsHistory: false };

  const newStroke = { ...stroke, isDrawing: false };
  let objs = [...objects];
  let sketch = objs.find(
    (o): o is PolarSketch => o.type === 'polar-sketch' && o.id === stroke.activeSketchId,
  );

  if (!sketch) {
    sketch = {
      id: generateId(),
      type: 'polar-sketch',
      name: nextFunctionName(),
      polarPoints: [],
      minTheta: Infinity,
      maxTheta: -Infinity,
      color: '#7c3aed',
      equation: null,
    };
    objs.push(sketch);
    newStroke.activeSketchId = sketch.id;
  }

  const merged = mergePolarStroke(stroke, sketch, toPixel);
  if (!merged.ok) {
    return {
      objects,
      stroke: { ...newStroke, currentStroke: [] },
      error: merged.error,
      needsHistory: false,
    };
  }

  sketch = {
    ...sketch,
    polarPoints: merged.polarPoints!,
    minTheta: merged.minTheta!,
    maxTheta: merged.maxTheta!,
    equation: null,
    equationDisplay: undefined,
    equationDisplayLatex: undefined,
  };
  objs = objs.map((o) => (o.id === sketch!.id ? sketch! : o));

  return {
    objects: objs,
    stroke: {
      ...newStroke,
      currentStroke: [],
      lastRawTheta: null,
      activeSketchId: sketch.id,
    },
    sketchId: sketch.id,
    info: merged.info,
    needsHistory: true,
  };
}
