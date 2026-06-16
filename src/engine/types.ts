/**
 * Core mathematical types for the sketch-to-function engine.
 * UI/app types live in `@/lib/types`; engine code should depend on these only.
 */

export interface MathPoint {
  x: number;
  y: number;
}

export interface PolarPoint {
  theta: number;
  r: number;
}

export type DomainVariable = 'x' | 'theta';

export interface Domain {
  min: number;
  max: number;
  variable: DomainVariable;
}

export type DataSource = 'sketch' | 'csv' | 'explicit' | 'fit';

/** Continuous function represented as samples + optional evaluator. */
export interface FunctionData {
  domain: Domain;
  /** Domain samples: (x, y) or (θ, r). */
  samples: MathPoint[];
  evaluate?: (t: number) => number;
  metadata: {
    source: DataSource;
    rawPointCount: number;
    fitMethod?: string;
    rSquared?: number;
    /** Phase 2: count after preprocess resample. */
    processedPointCount?: number;
    postprocess?: {
      monotonicPointCount: number;
      smoothed: boolean;
    };
  };
}

export interface FitEquationResult {
  method: string;
  methodLabel?: string;
  display: string;
  evaluate: (x: number) => number;
  rSquared?: number;
  coeffs?: number[];
  /** Phase 1: numeric diagnostics (condition number, warnings). */
  diagnostics?: {
    conditionNumber?: number;
    degree?: number;
    warning?: string;
    rmse?: number;
    maxResidual?: number;
    sampleCount?: number;
    knotCount?: number;
  };
  /** Serializable model for worker / project restore. */
  modelData?: FitModelData;
}

/** Named pipeline stage for documentation and composition. */
export interface PipelineStage<TIn, TOut> {
  readonly name: string;
  run(input: TIn): TOut;
}

export interface FitMethodOption {
  id: string;
  label: string;
}

export type FitModelData =
  | { type: 'polynomial'; coeffs: number[] }
  | { type: 'linear'; intercept: number; slope: number }
  | { type: 'pchip'; xs: number[]; ys: number[]; ms: number[] }
  | { type: 'fourier'; c0: number; terms: { k: number; sin: number; cos: number }[] }
  | { type: 'exponential'; a: number; b: number }
  | { type: 'power'; a: number; b: number }
  | { type: 'logarithmic'; intercept: number; slope: number };
