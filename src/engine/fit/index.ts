export {
  cartesianOptions,
  polarOptions,
  getOptions,
  fitCartesian,
  fitPolar,
  rSquared,
  COEF_DISPLAY_EPS,
  fitPolynomial,
  leastSquaresPoly,
  formatPolynomial,
} from './models';
export { solveLinear, leastSquares, conditionWarning } from '../numeric';
export { toFitPayload, fromFitPayload, type FitPayload } from './serialize';
export { rebuildEvaluate, type FitModelData } from './model-data';
export { buildPchip, evalPchip } from './pchip';
