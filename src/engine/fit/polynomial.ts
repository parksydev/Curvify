import type { MathPoint } from '../types';
import {
  COND_REJECT_THRESHOLD,
  COEF_DISPLAY_EPS,
  abscissaScale,
  conditionWarning,
  evalScaledPoly,
  leastSquares,
  scaledPolyToPowerBasis,
} from '../numeric';

export { COEF_DISPLAY_EPS } from '../numeric/constants';

export interface PolyFitDiagnostics {
  conditionNumber: number;
  degree: number;
  autoDegree: boolean;
  aic?: number;
  warning?: string;
}

export interface PolyFitResult {
  coeffs: number[];
  degree: number;
  xMin: number;
  xMax: number;
  display: string;
  evaluate: (x: number) => number;
  diagnostics: PolyFitDiagnostics;
}

export interface FitPolynomialOptions {
  /** Pick degree by minimum AIC in [1, maxDegree]. Default false. */
  autoDegree?: boolean;
}

export function fitPolynomial(
  points: MathPoint[],
  maxDegree = 6,
  options: FitPolynomialOptions = {},
): PolyFitResult | null {
  if (!points || points.length < 2) return null;

  const n = points.length;
  const cap = Math.min(maxDegree, n - 1, 8);
  if (cap < 1) return null;

  if (options.autoDegree) {
    return selectDegreeByAic(points, cap);
  }

  return fitPolynomialDegree(points, cap);
}

/** @deprecated Use fitPolynomial; kept for direct access. */
export function leastSquaresPoly(points: MathPoint[], degree: number): number[] | null {
  const result = fitPolynomialDegree(points, degree);
  return result?.coeffs ?? null;
}

function selectDegreeByAic(points: MathPoint[], maxDegree: number): PolyFitResult | null {
  const n = points.length;
  let best: PolyFitResult | null = null;
  let bestAic = Infinity;

  for (let d = 1; d <= maxDegree; d++) {
    const fit = fitPolynomialDegree(points, d);
    if (!fit) continue;
    if (fit.diagnostics.conditionNumber > COND_REJECT_THRESHOLD) continue;

    const rss = residualSumSquares(points, fit.evaluate);
    const k = d + 1;
    const aic = n * Math.log(rss / n + 1e-30) + 2 * k;

    if (aic < bestAic) {
      bestAic = aic;
      best = {
        ...fit,
        diagnostics: { ...fit.diagnostics, autoDegree: true, aic },
      };
    }
  }

  return best;
}

function fitPolynomialDegree(
  points: MathPoint[],
  degree: number,
): PolyFitResult | null {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const { shift, scale } = abscissaScale(xs);
  const m = degree + 1;

  const A: number[][] = [];
  for (let i = 0; i < points.length; i++) {
    const t = (xs[i] - shift) / scale;
    const row: number[] = [];
    let tp = 1;
    for (let j = 0; j < m; j++) {
      row.push(tp);
      tp *= t;
    }
    A.push(row);
  }

  const ls = leastSquares(A, ys);
  if (!ls) return null;

  const scaledCoeffs = ls.coeffs;
  const powerCoeffs = scaledPolyToPowerBasis(scaledCoeffs, shift, scale);
  const evaluate = (x: number) => evalScaledPoly(x, scaledCoeffs, shift, scale);
  const cond = ls.conditionEstimate;
  const warning = conditionWarning(cond);

  return {
    coeffs: powerCoeffs,
    degree,
    xMin: Math.min(...xs),
    xMax: Math.max(...xs),
    display: formatPolynomial(powerCoeffs, 'y'),
    evaluate,
    diagnostics: {
      conditionNumber: cond,
      degree,
      autoDegree: false,
      warning,
    },
  };
}

function residualSumSquares(points: MathPoint[], predict: (x: number) => number): number {
  let rss = 0;
  for (const p of points) {
    const e = p.y - predict(p.x);
    rss += e * e;
  }
  return rss;
}

function formatTerm(coef: number, power: number, variable = 'x') {
  if (Math.abs(coef) < COEF_DISPLAY_EPS) return null;
  const abs = Math.abs(coef);
  let coefStr: string;
  if (power === 0) coefStr = fmtNum(abs);
  else if (Math.abs(abs - 1) < COEF_DISPLAY_EPS) coefStr = '';
  else {
    coefStr = fmtNum(abs);
    if (coefStr === '0') return null;
  }

  let body: string;
  if (power === 0) body = coefStr;
  else if (power === 1) body = coefStr ? `${coefStr}${variable}` : variable;
  else body = coefStr ? `${coefStr}${variable}^${power}` : `${variable}^${power}`;

  return { negative: coef < 0, body };
}

export function formatPolynomial(coeffs: number[], lhs = '') {
  const parts: { negative: boolean; body: string }[] = [];
  for (let i = coeffs.length - 1; i >= 0; i--) {
    const t = formatTerm(coeffs[i], i);
    if (t) parts.push(t);
  }

  if (parts.length === 0) return lhs ? `${lhs} = 0` : '0';

  let expr = '';
  parts.forEach((t, idx) => {
    if (idx === 0) expr = (t.negative ? '−' : '') + t.body;
    else expr += (t.negative ? ' − ' : ' + ') + t.body;
  });

  return lhs ? `${lhs} = ${expr}` : expr;
}

function fmtNum(n: number) {
  const abs = Math.abs(n);
  if (abs < COEF_DISPLAY_EPS) return '0';
  if (Math.abs(n - Math.round(n)) < 1e-5) return String(Math.round(n));
  return n.toFixed(4).replace(/\.?0+$/, '');
}
