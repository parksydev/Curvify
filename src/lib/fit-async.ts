import { pipelineCartesianSketch, pipelinePolarSketch } from '@/engine/pipeline';
import { fromFitPayload, type FitPayload } from '@/engine/fit/serialize';
import type { FitEquationResult } from '@/engine/types';
import type { MathPoint } from '@/engine/types';
import type { FitWorkerRequest, FitWorkerResponse } from '@/engine/worker/fit.worker';

let worker: Worker | null = null;
let workerFailed = false;

function getWorker(): Worker | null {
  if (workerFailed || typeof window === 'undefined' || typeof Worker === 'undefined') return null;
  if (!worker) {
    try {
      worker = new Worker(new URL('../engine/worker/fit.worker.ts', import.meta.url));
      worker.onerror = () => {
        workerFailed = true;
        worker?.terminate();
        worker = null;
      };
    } catch {
      workerFailed = true;
      return null;
    }
  }
  return worker;
}

function fitSync(points: MathPoint[], method: string, isPolar: boolean): FitEquationResult | null {
  const result = isPolar
    ? pipelinePolarSketch(points, method)
    : pipelineCartesianSketch(points, method);
  return result.fit;
}

export function fitSketchAsync(
  points: MathPoint[],
  method: string,
  isPolar: boolean,
): Promise<FitEquationResult | null> {
  const w = getWorker();
  if (!w) return Promise.resolve(fitSync(points, method, isPolar));

  return new Promise((resolve) => {
    const id = crypto.randomUUID();
    const onMessage = (event: MessageEvent<FitWorkerResponse>) => {
      if (event.data.id !== id) return;
      w.removeEventListener('message', onMessage);
      const payload = event.data.payload;
      resolve(payload ? fromFitPayload(payload) : null);
    };
    w.addEventListener('message', onMessage);
    const req: FitWorkerRequest = { id, isPolar, points, method };
    w.postMessage(req);
  });
}

export type { FitPayload };
