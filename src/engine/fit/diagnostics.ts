import type { MathPoint } from '../types';

export interface FitDiagnosticsStats {
  rmse?: number;
  maxResidual?: number;
  sampleCount?: number;
  knotCount?: number;
}

export function computeFitDiagnostics(
  samples: MathPoint[],
  predict: (x: number) => number,
): FitDiagnosticsStats {
  if (!samples.length) return { sampleCount: 0 };
  let ssRes = 0;
  let maxAbs = 0;
  for (const p of samples) {
    const yh = predict(p.x);
    if (!Number.isFinite(yh)) return { sampleCount: samples.length, rmse: Infinity, maxResidual: Infinity };
    const e = p.y - yh;
    ssRes += e * e;
    maxAbs = Math.max(maxAbs, Math.abs(e));
  }
  return {
    sampleCount: samples.length,
    rmse: Math.sqrt(ssRes / samples.length),
    maxResidual: maxAbs,
  };
}
