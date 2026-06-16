import { plainToLatex } from './latex';
import { pipelineCartesianSketch, pipelinePolarSketch } from '@/engine/pipeline';
import { fitSketchAsync } from './fit-async';
import {
  cartesianOptions,
  polarOptions,
  getOptions,
  fitCartesian,
  fitPolar,
} from '@/engine/fit';
import type {
  FitEquation,
  FunctionSketch,
  GraphObject,
  PolarSketch,
} from './types';

export type { FitMethodOption } from '@/engine/types';
export { cartesianOptions, polarOptions, getOptions, fitCartesian, fitPolar };

export function applyCartesianSketch(sketch: FunctionSketch, method: string): void {
  if (!sketch.points || sketch.points.length < 3) {
    sketch.equation = null;
    sketch.equationDisplay = `${sketch.name}: (${sketch.points?.length || 0}점)`;
    return;
  }
  const { fit } = pipelineCartesianSketch(sketch.points, method);
  attachCartesian(sketch, fit, fit?.method || method);
}

export async function applyCartesianSketchAsync(
  sketch: FunctionSketch,
  method: string,
): Promise<void> {
  if (!sketch.points || sketch.points.length < 3) {
    sketch.equation = null;
    sketch.equationDisplay = `${sketch.name}: (${sketch.points?.length || 0}점)`;
    return;
  }
  const fit = await fitSketchAsync(sketch.points, method, false);
  attachCartesian(sketch, fit, fit?.method || method);
}

export function applyPolarSketch(sketch: PolarSketch, method: string): void {
  if (!sketch.polarPoints || sketch.polarPoints.length < 3) {
    sketch.equation = null;
    sketch.equationDisplay = `${sketch.name}: (${sketch.polarPoints?.length || 0}점)`;
    return;
  }
  const samples = sketch.polarPoints.map((p) => ({ x: p.theta, y: p.r }));
  const { fit } = pipelinePolarSketch(samples, method);
  attachPolar(sketch, fit, fit?.method || method);
}

export async function applyPolarSketchAsync(sketch: PolarSketch, method: string): Promise<void> {
  if (!sketch.polarPoints || sketch.polarPoints.length < 3) {
    sketch.equation = null;
    sketch.equationDisplay = `${sketch.name}: (${sketch.polarPoints?.length || 0}점)`;
    return;
  }
  const samples = sketch.polarPoints.map((p) => ({ x: p.theta, y: p.r }));
  const fit = await fitSketchAsync(samples, method, true);
  attachPolar(sketch, fit, fit?.method || method);
}

export async function refitAllAsync(
  objects: GraphObject[],
  isPolar: boolean,
  method: string,
): Promise<void> {
  await Promise.all(
    objects.map(async (obj) => {
      if (!isPolar && obj.type === 'function-sketch') await applyCartesianSketchAsync(obj, method);
      if (isPolar && obj.type === 'polar-sketch') await applyPolarSketchAsync(obj, method);
    }),
  );
}

export function refitAll(objects: GraphObject[], isPolar: boolean, method: string): void {
  for (const obj of objects) {
    if (!isPolar && obj.type === 'function-sketch') applyCartesianSketch(obj, method);
    if (isPolar && obj.type === 'polar-sketch') applyPolarSketch(obj, method);
  }
}

function attachCartesian(sketch: FunctionSketch, fit: FitEquation | null, method: string): void {
  const usedMethod = fit?.method || method;
  sketch.fitMethod = usedMethod;
  if (!fit) {
    sketch.equation = null;
    sketch.equationDisplay = `${sketch.name} = 스케치 (${sketch.points.length}점)`;
    return;
  }
  sketch.equation = fit;
  const rhs = fit.display.replace(/^y\s*=\s*/, '');
  sketch.equationDisplay = `${sketch.name}(x) ≈ ${rhs}`;
  sketch.equationDisplayLatex = `${sketch.name}(x) \\approx ${plainToLatex(rhs)}`;
}

function attachPolar(sketch: PolarSketch, fit: FitEquation | null, method: string): void {
  const usedMethod = fit?.method || method;
  sketch.fitMethod = usedMethod;
  if (!fit) {
    sketch.equation = null;
    sketch.equationDisplay = `${sketch.name}(θ) = 스케치`;
    return;
  }
  sketch.equation = fit;
  const rhs = fit.display.replace(/^r\s*=\s*/, '');
  sketch.equationDisplay = `${sketch.name}(θ) ≈ ${rhs}`;
  sketch.equationDisplayLatex = `${sketch.name}(\\theta) \\approx ${plainToLatex(rhs)}`;
}

export const FitModels = {
  cartesianOptions,
  polarOptions,
  getOptions,
  fitCartesian,
  fitPolar,
  applyCartesianSketch,
  applyPolarSketch,
  applyCartesianSketchAsync,
  applyPolarSketchAsync,
  refitAll,
  refitAllAsync,
};
