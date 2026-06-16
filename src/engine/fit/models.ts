import { COEF_DISPLAY_EPS, fitPolynomial } from './polynomial';
import { computeFitDiagnostics } from './diagnostics';
import { buildPchip, evalPchip } from './pchip';
import { leastSquares } from '../numeric';
import type { FitEquationResult, FitMethodOption, MathPoint } from '../types';

export { COEF_DISPLAY_EPS, fitPolynomial, leastSquaresPoly, formatPolynomial } from './polynomial';

interface FitResult extends FitEquationResult {}

interface BasisFn {
  fn: (x: number) => number;
  fmt: (c: number) => string | null;
}

interface LinearCombinationResult {
  coeffs: number[];
  expr: string;
  evaluate: (x: number) => number;
  rSquared: number;
}

interface TermPart {
  c: number;
  text: string;
}

export const cartesianOptions: FitMethodOption[] = [
  { id: 'auto', label: '자동 (최적)' },
  { id: 'pchip', label: 'PCHIP 스플라인' },
  { id: 'polynomial', label: '다항식' },
  { id: 'trigonometric', label: 'sin / cos 조합' },
  { id: 'exponential', label: '지수 a·e^(bx)' },
  { id: 'power', label: '거듭제곱 a·x^b' },
  { id: 'logarithmic', label: '로그 a + b·ln(x)' },
  { id: 'linear', label: '일차 (ax + b)' },
];

export const polarOptions: FitMethodOption[] = [
  { id: 'auto', label: '자동 (최적)' },
  { id: 'pchip', label: 'PCHIP 스플라인' },
  { id: 'polynomial', label: '다항식 (θ)' },
  { id: 'trigonometric', label: 'sin / cos 조합' },
  { id: 'exponential', label: '지수 a·e^(bθ)' },
  { id: 'linear', label: '일차 (a + b·θ)' },
];

export function getOptions(isPolar: boolean): FitMethodOption[] {
  return isPolar ? polarOptions : cartesianOptions;
}

export function fitCartesian(samples: MathPoint[], method: string): FitResult | null {
  if (method === 'auto') return autoCartesian(samples);
  return fitCartesianByMethod(samples, method);
}

export function fitPolar(samples: MathPoint[], method: string): FitResult | null {
  if (method === 'auto') return autoPolar(samples);
  return fitPolarByMethod(samples, method);
}

function autoCartesian(samples: MathPoint[]): FitResult | null {
  const methods = ['linear', 'polynomial', 'trigonometric', 'exponential', 'power', 'logarithmic'];
  return pickBest(samples, methods, (s, m) => fitCartesianByMethod(s, m));
}

function autoPolar(samples: MathPoint[]): FitResult | null {
  const methods = ['linear', 'polynomial', 'trigonometric', 'exponential'];
  return pickBest(samples, methods, (s, m) => fitPolarByMethod(s, m));
}

function pickBest(
  samples: MathPoint[],
  methods: string[],
  fitter: (s: MathPoint[], m: string) => FitResult | null,
): FitResult | null {
  let best: FitResult | null = null;
  for (const m of methods) {
    const fit = fitter(samples, m);
    if (!fit) continue;
    if (!best || (fit.rSquared ?? -Infinity) > (best.rSquared ?? -Infinity)) best = fit;
  }
  if (best) best.methodLabel = methodLabel(best.method);
  return best;
}

function fitCartesianByMethod(samples: MathPoint[], method: string): FitResult | null {
  switch (method) {
    case 'pchip':
      return fitPchip(samples, 'y');
    case 'polynomial':
      return wrapPolyResult(samples, fitPolynomial(samples, 6, { autoDegree: true }), 'polynomial');
    case 'trigonometric':
      return fourier(samples, 'x', 4, 'trigonometric');
    case 'exponential':
      return exponential(samples, 'x', 'exponential');
    case 'power':
      return power(samples, 'x');
    case 'logarithmic':
      return logarithmic(samples, 'x');
    case 'linear':
      return linear(samples, 'x');
    default:
      return null;
  }
}

function fitPolarByMethod(samples: MathPoint[], method: string): FitResult | null {
  switch (method) {
    case 'pchip':
      return fitPchip(samples, 'r');
    case 'polynomial': {
      const p = fitPolynomial(samples, 6, { autoDegree: true });
      if (!p) return null;
      return finalize(samples, {
        method: 'polynomial',
        methodLabel: methodLabel('polynomial'),
        display: `r = ${p.display.replace(/^y\s*=\s*/, '')}`,
        evaluate: p.evaluate,
        rSquared: rSquared(samples, p.evaluate),
        coeffs: p.coeffs,
        modelData: { type: 'polynomial', coeffs: p.coeffs },
        diagnostics: polyDiagnostics(p),
      });
    }
    case 'trigonometric':
      return fourier(samples, 'θ', 4, 'trigonometric', 'r');
    case 'exponential':
      return exponential(samples, 'θ', 'exponential', 'r');
    case 'linear':
      return linear(samples, 'θ', 'r');
    default:
      return null;
  }
}

function fitPchip(samples: MathPoint[], lhs: 'y' | 'r'): FitResult | null {
  const spline = buildPchip(samples);
  if (!spline) return null;
  const evaluate = (x: number) => evalPchip(spline, x);
  const n = spline.xs.length;
  return finalize(samples, {
    method: 'pchip',
    methodLabel: methodLabel('pchip'),
    display: lhs === 'r' ? `r = PCHIP(${n} knots)` : `y = PCHIP(${n} knots)`,
    evaluate,
    rSquared: rSquared(samples, evaluate),
    modelData: { type: 'pchip', xs: spline.xs, ys: spline.ys, ms: spline.ms },
    diagnostics: { knotCount: n },
  });
}

function wrapPolyResult(
  samples: MathPoint[],
  poly: ReturnType<typeof fitPolynomial>,
  method: string,
): FitResult | null {
  if (!poly) return null;
  return finalize(samples, {
    method,
    methodLabel: methodLabel(method),
    display: poly.display,
    evaluate: poly.evaluate,
    rSquared: rSquared(samples, poly.evaluate),
    coeffs: poly.coeffs,
    modelData: { type: 'polynomial', coeffs: poly.coeffs },
    diagnostics: polyDiagnostics(poly),
  });
}

function finalize(samples: MathPoint[], fit: FitResult): FitResult {
  const stats = computeFitDiagnostics(samples, fit.evaluate);
  return {
    ...fit,
    diagnostics: { ...fit.diagnostics, ...stats },
  };
}

function polyDiagnostics(poly: NonNullable<ReturnType<typeof fitPolynomial>>) {
  return {
    conditionNumber: poly.diagnostics.conditionNumber,
    degree: poly.diagnostics.degree,
    warning: poly.diagnostics.warning,
  };
}

function fourier(
  samples: MathPoint[],
  variable: string,
  harmonics: number,
  method: string,
  lhs = 'y',
): FitResult | null {
  const maxK = Math.max(1, Math.min(harmonics, Math.floor((samples.length - 1) / 2)));
  const bases: BasisFn[] = [
    { fn: () => 1, fmt: (c) => (Math.abs(c) < COEF_DISPLAY_EPS ? null : fmtNum(c)) },
  ];
  for (let k = 1; k <= maxK; k++) {
    const kk = k;
    const v = kk === 1 ? variable : `${kk}*${variable}`;
    bases.push({
      fn: (x) => Math.sin(kk * x),
      fmt: (c) => fmtTrigTerm(c, `sin(${v})`),
    });
    bases.push({
      fn: (x) => Math.cos(kk * x),
      fmt: (c) => fmtTrigTerm(c, `cos(${v})`),
    });
  }
  const fit = linearCombination(samples, bases);
  if (!fit) return null;
  const display = lhs === 'r' ? `r = ${fit.expr}` : `y = ${fit.expr}`;
  const terms: { k: number; sin: number; cos: number }[] = [];
  for (let k = 1; k <= maxK; k++) {
    terms.push({ k, sin: fit.coeffs[1 + (k - 1) * 2], cos: fit.coeffs[2 + (k - 1) * 2] });
  }
  return finalize(samples, {
    method,
    methodLabel: methodLabel(method),
    display,
    evaluate: fit.evaluate,
    rSquared: fit.rSquared,
    modelData: { type: 'fourier', c0: fit.coeffs[0], terms },
  });
}

function linear(samples: MathPoint[], variable: string, lhs = 'y'): FitResult | null {
  const fit = linearCombination(samples, [
    { fn: () => 1, fmt: (c) => (Math.abs(c) < COEF_DISPLAY_EPS ? null : fmtNum(c)) },
    { fn: (v) => v, fmt: (c) => fmtLinTerm(c, variable) },
  ]);
  if (!fit) return null;
  const display = lhs === 'r' ? `r = ${fit.expr}` : `y = ${fit.expr}`;
  return finalize(samples, {
    method: 'linear',
    methodLabel: methodLabel('linear'),
    display,
    evaluate: fit.evaluate,
    rSquared: fit.rSquared,
    coeffs: fit.coeffs,
    modelData: { type: 'linear', intercept: fit.coeffs[0], slope: fit.coeffs[1] },
  });
}

function exponential(
  samples: MathPoint[],
  variable: string,
  method: string,
  lhs = 'y',
): FitResult | null {
  const valid = samples.filter((p) => p.y > 1e-8);
  if (valid.length < 3) return null;
  const logPts = valid.map((p) => ({ x: p.x, y: Math.log(p.y) }));
  const lin = linearCombination(logPts, [
    { fn: () => 1, fmt: () => null },
    { fn: (v) => v, fmt: (c) => fmtLinTerm(c, variable) },
  ]);
  if (!lin) return null;
  const a = Math.exp(lin.coeffs[0]);
  const b = lin.coeffs[1];
  const predict = (v: number) => a * Math.exp(b * v);
  const expr = `${fmtNum(a)}·e^(${fmtNum(b)}·${variable})`;
  const display = lhs === 'r' ? `r = ${expr}` : `y = ${expr}`;
  return finalize(samples, {
    method: 'exponential',
    methodLabel: methodLabel('exponential'),
    display,
    evaluate: predict,
    rSquared: rSquared(samples, predict),
    modelData: { type: 'exponential', a, b },
  });
}

function power(samples: MathPoint[], variable: string): FitResult | null {
  const valid = samples.filter((p) => p.x > 1e-8 && p.y > 1e-8);
  if (valid.length < 3) return null;
  const logPts = valid.map((p) => ({ x: Math.log(p.x), y: Math.log(p.y) }));
  const lin = linearCombination(logPts, [
    { fn: () => 1, fmt: () => null },
    { fn: (v) => v, fmt: (c) => fmtLinTerm(c, `ln(${variable})`) },
  ]);
  if (!lin) return null;
  const a = Math.exp(lin.coeffs[0]);
  const b = lin.coeffs[1];
  const predict = (v: number) => (v > 0 ? a * Math.pow(v, b) : NaN);
  return finalize(samples, {
    method: 'power',
    methodLabel: methodLabel('power'),
    display: `y = ${fmtNum(a)}·${variable}^${fmtNum(b)}`,
    evaluate: predict,
    rSquared: rSquared(samples, predict),
    modelData: { type: 'power', a, b },
  });
}

function logarithmic(samples: MathPoint[], variable: string): FitResult | null {
  const valid = samples.filter((p) => p.x > 1e-8);
  if (valid.length < 3) return null;
  const fit = linearCombination(valid, [
    { fn: () => 1, fmt: (c) => (Math.abs(c) < COEF_DISPLAY_EPS ? null : fmtNum(c)) },
    { fn: (v) => Math.log(v), fmt: (c) => fmtLinTerm(c, `ln(${variable})`) },
  ]);
  if (!fit) return null;
  return finalize(samples, {
    method: 'logarithmic',
    methodLabel: methodLabel('logarithmic'),
    display: `y = ${fit.expr}`,
    evaluate: fit.evaluate,
    rSquared: fit.rSquared,
    modelData: { type: 'logarithmic', intercept: fit.coeffs[0], slope: fit.coeffs[1] },
  });
}

function linearCombination(samples: MathPoint[], bases: BasisFn[]): LinearCombinationResult | null {
  const n = samples.length;
  const m = bases.length;
  if (n < m) return null;

  const A = samples.map((p) => bases.map((b) => b.fn(p.x)));
  const b = samples.map((p) => p.y);
  const ls = leastSquares(A, b);
  if (!ls) return null;

  const coeffs = ls.coeffs;
  const terms: TermPart[] = [];
  bases.forEach((basis, i) => {
    const t = basis.fmt(coeffs[i]);
    if (t) terms.push({ c: coeffs[i], text: t });
  });

  const evaluate = (x: number) => {
    let y = 0;
    for (let i = 0; i < m; i++) y += coeffs[i] * bases[i].fn(x);
    return y;
  };

  return {
    coeffs,
    expr: joinTerms(terms),
    evaluate,
    rSquared: rSquared(samples, evaluate),
  };
}

export function rSquared(samples: MathPoint[], predict: (x: number) => number): number {
  const ys = samples.map((p) => p.y);
  const mean = ys.reduce((a, b) => a + b, 0) / ys.length;
  let ssTot = 0;
  let ssRes = 0;
  for (const p of samples) {
    const yh = predict(p.x);
    if (!Number.isFinite(yh)) return -Infinity;
    ssTot += (p.y - mean) ** 2;
    ssRes += (p.y - yh) ** 2;
  }
  if (ssTot < 1e-12) return 1;
  return Math.max(0, 1 - ssRes / ssTot);
}

function joinTerms(terms: TermPart[]): string {
  if (!terms.length) return '0';
  let s = '';
  terms.forEach((t, i) => {
    const neg = t.c < 0;
    const body = t.text.startsWith('−') ? t.text.slice(1) : t.text;
    if (i === 0) s = (neg ? '−' : '') + body;
    else s += (neg ? ' − ' : ' + ') + body;
  });
  return s.trim();
}

function fmtTrigTerm(c: number, fnStr: string): string | null {
  if (Math.abs(c) < COEF_DISPLAY_EPS) return null;
  const abs = Math.abs(c);
  const coef = Math.abs(abs - 1) < 1e-5 ? '' : fmtNum(abs);
  const body = coef ? `${coef}·${fnStr}` : fnStr;
  return (c < 0 ? '−' : '') + body;
}

function fmtLinTerm(c: number, varPart: string): string | null {
  if (Math.abs(c) < COEF_DISPLAY_EPS) return null;
  const abs = Math.abs(c);
  const coef = Math.abs(abs - 1) < 1e-5 ? '' : fmtNum(abs);
  const body = coef ? `${coef}·${varPart}` : varPart;
  return (c < 0 ? '−' : '') + body;
}

function fmtNum(n: number): string {
  if (Math.abs(n) < COEF_DISPLAY_EPS) return '0';
  if (Math.abs(n - Math.round(n)) < 1e-5) return String(Math.round(n));
  return n.toFixed(4).replace(/\.?0+$/, '');
}

function methodLabel(id: string): string {
  const all = [...cartesianOptions, ...polarOptions];
  return all.find((o) => o.id === id)?.label || id;
}
