import type { FitEquationResult } from '../types';
import { rebuildEvaluate, type FitModelData } from './model-data';

export interface FitPayload {
  method: string;
  methodLabel?: string;
  display: string;
  rSquared?: number;
  coeffs?: number[];
  diagnostics?: FitEquationResult['diagnostics'];
  modelData: FitModelData;
}

export function toFitPayload(fit: FitEquationResult): FitPayload | null {
  if (!fit.modelData) return null;
  return {
    method: fit.method,
    methodLabel: fit.methodLabel,
    display: fit.display,
    rSquared: fit.rSquared,
    coeffs: fit.coeffs,
    diagnostics: fit.diagnostics,
    modelData: fit.modelData,
  };
}

export function fromFitPayload(payload: FitPayload): FitEquationResult {
  return {
    method: payload.method,
    methodLabel: payload.methodLabel,
    display: payload.display,
    rSquared: payload.rSquared,
    coeffs: payload.coeffs,
    diagnostics: payload.diagnostics,
    modelData: payload.modelData,
    evaluate: rebuildEvaluate(payload.modelData),
  };
}
