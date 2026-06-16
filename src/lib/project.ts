import type {
  CoordMode,
  FitEquation,
  FunctionSketch,
  GraphObject,
  PolarSketch,
  ProjectDocument,
  SerializableObject,
  ViewOptions,
} from './types';
import { compileExpression, compilePolarExpression } from './parser';
import { applyCartesianSketch, applyPolarSketch } from './fit-models';

const PROJECT_VERSION = 1 as const;

export function serializeProject(state: {
  coordMode: CoordMode;
  fitMethodCartesian: string;
  fitMethodPolar: string;
  unitScale: number;
  panX: number;
  panY: number;
  view: ViewOptions;
  objects: GraphObject[];
  nextId: number;
}): ProjectDocument {
  const objects: SerializableObject[] = state.objects.map((obj) => {
    const copy = JSON.parse(JSON.stringify(obj)) as SerializableObject;
    if ('evaluate' in copy) delete (copy as { evaluate?: unknown }).evaluate;
    if (copy.type === 'function-sketch' || copy.type === 'polar-sketch') {
      if (copy.equation) {
        const { evaluate: _e, ...eqRest } = copy.equation as FitEquation & { evaluate?: unknown };
        copy.equation = eqRest as Omit<FitEquation, 'evaluate'>;
      }
    }
    return copy;
  });

  return {
    version: PROJECT_VERSION,
    coordMode: state.coordMode,
    fitMethodCartesian: state.fitMethodCartesian,
    fitMethodPolar: state.fitMethodPolar,
    unitScale: state.unitScale,
    panX: state.panX,
    panY: state.panY,
    view: state.view,
    objects,
    nextId: state.nextId,
  };
}

export function deserializeProject(doc: ProjectDocument): {
  coordMode: CoordMode;
  fitMethodCartesian: string;
  fitMethodPolar: string;
  unitScale: number;
  panX: number;
  panY: number;
  view: ViewOptions;
  objects: GraphObject[];
  nextId: number;
} {
  if (doc.version !== 1) throw new Error('지원하지 않는 프로젝트 버전입니다.');

  const objects = doc.objects.map((obj) => restoreObject(obj)) as GraphObject[];

  for (const obj of objects) {
    if (obj.type === 'function-sketch') applyCartesianSketch(obj, doc.fitMethodCartesian);
    if (obj.type === 'polar-sketch') applyPolarSketch(obj, doc.fitMethodPolar);
  }

  return {
    coordMode: doc.coordMode,
    fitMethodCartesian: doc.fitMethodCartesian,
    fitMethodPolar: doc.fitMethodPolar,
    unitScale: doc.unitScale,
    panX: doc.panX,
    panY: doc.panY,
    view: { ...defaultView(), ...doc.view },
    objects,
    nextId: doc.nextId,
  };
}

function defaultView(): ViewOptions {
  return {
    showGrid: true,
    showAxes: true,
    showSketchOverlay: true,
    showDerivative: false,
    showIntegral: false,
    integralFrom: -2,
    integralTo: 2,
  };
}

function restoreObject(obj: SerializableObject): GraphObject {
  const o = { ...obj } as GraphObject;

  if (o.type === 'function-explicit' || o.type === 'polar-explicit') {
    const src = o._exprSource || o.expr;
    if (src) {
      const compiled =
        o.type === 'function-explicit'
          ? compileExpression(applyParamValues(src, o.paramValues))
          : compilePolarExpression(applyParamValues(src, o.paramValues));
      if (compiled.ok) o.evaluate = compiled.evaluate;
    }
  }

  if (o.type === 'function-sketch' && o.points?.length >= 2) {
    o.minX = o.points[0].x;
    o.maxX = o.points[o.points.length - 1].x;
  }
  if (o.type === 'polar-sketch' && o.polarPoints?.length >= 2) {
    o.minTheta = o.polarPoints[0].theta;
    o.maxTheta = o.polarPoints[o.polarPoints.length - 1].theta;
  }

  return o;
}

export function applyParamValues(expr: string, params?: Record<string, number>) {
  if (!params) return expr;
  let s = expr;
  for (const [name, val] of Object.entries(params)) {
    s = s.replace(new RegExp(`\\b${name}\\b`, 'g'), String(val));
  }
  return s;
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function recompileExplicit(obj: GraphObject) {
  if (obj.type !== 'function-explicit' && obj.type !== 'polar-explicit') return;
  const src = applyParamValues(obj._exprSource || obj.expr, obj.paramValues);
  const compiled =
    obj.type === 'function-explicit'
      ? compileExpression(src)
      : compilePolarExpression(src);
  if (compiled.ok) obj.evaluate = compiled.evaluate;
}

export type { FunctionSketch, PolarSketch };
