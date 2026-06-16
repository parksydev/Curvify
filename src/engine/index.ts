export type {
  MathPoint,
  PolarPoint,
  DomainVariable,
  Domain,
  DataSource,
  FunctionData,
  FitEquationResult,
  PipelineStage,
  FitMethodOption,
} from './types';

export * as numeric from './numeric';
export * as geometry from './geometry';
export * as fit from './fit';
export * as sketch from './sketch';
export * as pipeline from './pipeline';
export * as analysis from './analysis';

export { solveLinear, leastSquares, conditionWarning } from './numeric';
export { samplePolyline, toPolar, toCartesian, polarPointToCartesian, unwrapTheta } from './geometry';
export {
  fitCartesian,
  fitPolar,
  fitPolynomial,
  leastSquaresPoly,
  formatPolynomial,
  cartesianOptions,
  polarOptions,
  getOptions,
  rSquared,
  COEF_DISPLAY_EPS,
} from './fit';
export {
  strokeToFunctionData,
  fitFunctionData,
  pipelineCartesianSketch,
  pipelinePolarSketch,
  preprocessCartesianStroke,
  preprocessPolarStroke,
} from './pipeline';
export {
  projectMonotonicX,
  samplePolylineAdaptive,
  smoothPoints,
} from './geometry';
export { numericDerivative, sampleDefiniteIntegral, simpsonIntegral } from './analysis';
