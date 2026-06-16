/// <reference lib="webworker" />

import { pipelineCartesianSketch, pipelinePolarSketch } from '../pipeline';
import { toFitPayload, type FitPayload } from '../fit/serialize';

export interface FitWorkerRequest {
  id: string;
  isPolar: boolean;
  points: { x: number; y: number }[];
  method: string;
  stepMath?: number;
}

export interface FitWorkerResponse {
  id: string;
  payload: FitPayload | null;
}

self.onmessage = (event: MessageEvent<FitWorkerRequest>) => {
  const { id, isPolar, points, method, stepMath = 0.05 } = event.data;
  try {
    const result = isPolar
      ? pipelinePolarSketch(points, method)
      : pipelineCartesianSketch(points, method, stepMath);
    const payload = result.fit ? toFitPayload(result.fit) : null;
    const response: FitWorkerResponse = { id, payload };
    self.postMessage(response);
  } catch {
    self.postMessage({ id, payload: null } satisfies FitWorkerResponse);
  }
};
