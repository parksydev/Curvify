import {
  formatR,
  formatTheta,
  isPolarMode,
  parseAngle,
  toCartesian,
  toPolar,
} from './coords';
import {
  fnCartesian,
  fnPolar,
  looksLikeLatex,
  plainToLatex,
  pointCartesian,
  pointPolar,
  stripDelimiters,
  toExpr,
} from './latex';
import type { CoordMode, ParseResult, ParseResultOk } from './types';

/** Real number literal (integer, decimal, scientific) */
export const NUM = '[-+]?(?:\\d+\\.\\d+|\\d+\\.?|\\d*\\.\\d+)(?:[eE][-+]?\\d+)?';

export interface CompileResultOk {
  ok: true;
  evaluate: (v: number) => number;
}

export interface CompileResultErr {
  ok: false;
  error: string;
}

export type CompileResult = CompileResultOk | CompileResultErr;

export interface ValidateResultOk {
  ok: true;
  display: string;
  displayLatex: string;
  result: ParseResultOk;
}

export interface ValidateResultErr {
  ok: false;
  error: string;
  display: string;
}

export type ValidateResult = ValidateResultOk | ValidateResultErr;

/** LaTeX·일반식 공통 정규화 */
export function normalize(raw: string): string {
  let s = typeof raw === 'string' ? raw.trim() : '';
  s = stripDelimiters(s);
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/:=/g, '=');
  s = s.replace(/×/g, '*');
  s = s.replace(/÷/g, '/');
  s = s.replace(/·/g, '*');
  s = s.replace(/π/g, 'pi');
  s = s.replace(/φ/g, 'theta');
  s = s.replace(/ℯ/g, 'e');
  s = s.replace(/\*\*/g, '^');
  s = normalizeDecimalCommas(s);
  return s;
}

/** 2,5 → 2.5 (쉼표 소수). 좌표 (3, 14)처럼 쉼표 뒤 공백이 있으면 유지 */
function normalizeDecimalCommas(s: string): string {
  return s.replace(/(\d),(\d)/g, '$1.$2');
}

export function parse(input: string, coordMode: CoordMode): ParseResult {
  const raw = normalize(input);
  if (!raw) return { ok: false, error: '입력이 비어 있습니다.' };

  if (isPolarMode(coordMode)) return parsePolar(raw);
  return parseCartesian(raw);
}

export function validate(input: string, coordMode: CoordMode): ValidateResult {
  const raw = normalize(input);
  if (!raw) return { ok: false, error: '비어 있음', display: '' };

  try {
    const result = parse(input, coordMode);
    if (!result.ok) {
      return { ok: false, error: result.error, display: raw };
    }
    const display: string =
      result.display ||
      (result.type === 'point' && result.name
        ? `${result.name} = (${result.x?.toFixed?.(3) ?? result.x}, ${result.y?.toFixed?.(3) ?? result.y})`
        : raw);
    const displayLatex: string =
      result.displayLatex ||
      (result.type === 'function-explicit'
        ? fnCartesian(result.name, result.exprLatex || result.expr || '')
        : result.type === 'polar-explicit'
          ? fnPolar(result.name, result.exprLatex || result.expr || '')
          : plainToLatex(display));
    return { ok: true, display, displayLatex, result };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, display: raw };
  }
}

function exprToPlain(exprPart: string): string {
  const t = exprPart.trim();
  return looksLikeLatex(t) ? toExpr(t) : t;
}

function parseCartesian(raw: string): ParseResult {
  const pointRe = new RegExp(
    `^([A-Z])\\s*=\\s*\\(\\s*(${NUM})\\s*,\\s*(${NUM})\\s*\\)$`,
    'i',
  );
  const pointMatch = raw.match(pointRe);
  if (pointMatch) {
    const nm = pointMatch[1].toUpperCase();
    const x = parseFloat(pointMatch[2]);
    const y = parseFloat(pointMatch[3]);
    return {
      ok: true,
      type: 'point',
      name: nm,
      x,
      y,
      display: `${nm} = (${pointMatch[2]}, ${pointMatch[3]})`,
      displayLatex: pointCartesian(nm, x, y),
    };
  }

  let name = 'f';
  let exprRaw = raw;
  let exprLatex: string | null = null;

  const fnMatch = raw.match(/^([a-z])\s*\(\s*x\s*\)\s*=\s*(.+)$/i);
  if (fnMatch) {
    name = fnMatch[1].toLowerCase();
    exprRaw = fnMatch[2];
  } else {
    const yMatch = raw.match(/^y\s*=\s*(.+)$/i);
    if (yMatch) exprRaw = yMatch[1];
    else {
      const gMatch = raw.match(/^([a-z])\s*=\s*(.+)$/i);
      if (gMatch && gMatch[1] !== 'x' && gMatch[1] !== 'y') {
        name = gMatch[1].toLowerCase();
        exprRaw = gMatch[2];
      }
    }
  }

  if (looksLikeLatex(exprRaw)) {
    exprLatex = stripDelimiters(exprRaw);
  }
  const exprPlain = exprToPlain(exprRaw);
  const compiled = compileExpression(exprPlain);
  if (!compiled.ok) return compiled;

  const dl = fnCartesian(name, exprLatex || exprPlain);
  return {
    ok: true,
    type: 'function-explicit',
    name,
    expr: exprPlain,
    exprLatex: exprLatex || exprPlain,
    display: `${name}(x) = ${exprPlain}`,
    displayLatex: dl,
    evaluate: compiled.evaluate,
  };
}

function parsePolar(raw: string): ParseResult {
  const polarPtRe = new RegExp(
    `^([A-Z])\\s*=\\s*\\(\\s*(${NUM})\\s*[;,]\\s*([^)]+)\\s*\\)$`,
    'i',
  );
  const polarPoint = raw.match(polarPtRe);
  if (polarPoint) {
    try {
      const r = parseFloat(polarPoint[2]);
      const theta = parseAngle(polarPoint[3]);
      const cart = toCartesian(r, theta);
      const nm = polarPoint[1].toUpperCase();
      return {
        ok: true,
        type: 'point',
        name: nm,
        x: cart.x,
        y: cart.y,
        polar: { r, theta },
        display: `${nm} = (${formatR(r)}; ${formatTheta(theta)})`,
        displayLatex: pointPolar(nm, r, theta),
      };
    } catch {
      return { ok: false, error: '극좌표 점: A=(r; θ) 예: A=(2; 45°)' };
    }
  }

  const cartPtRe = new RegExp(
    `^([A-Z])\\s*=\\s*\\(\\s*(${NUM})\\s*,\\s*(${NUM})\\s*\\)$`,
    'i',
  );
  const cartPoint = raw.match(cartPtRe);
  if (cartPoint) {
    const x = parseFloat(cartPoint[2]);
    const y = parseFloat(cartPoint[3]);
    const { r, theta } = toPolar(x, y);
    const nm = cartPoint[1].toUpperCase();
    return {
      ok: true,
      type: 'point',
      name: nm,
      x,
      y,
      polar: { r, theta },
      display: `${nm} = (${formatR(r)}; ${formatTheta(theta)})`,
      displayLatex: pointPolar(nm, r, theta),
    };
  }

  let name = 'r';
  let exprRaw = raw;
  let exprLatex: string | null = null;

  const patterns = [
    /^([a-z])\s*\(\s*[θt]heta?\s*\)\s*=\s*(.+)$/i,
    /^r\s*\(\s*[θt]heta?\s*\)\s*=\s*(.+)$/i,
    /^r\s*=\s*(.+)$/i,
    /^([a-z])\s*=\s*(.+)$/i,
  ];

  for (const re of patterns) {
    const m = raw.match(re);
    if (m) {
      if (m[1] && m[1].length === 1) name = m[1].toLowerCase();
      exprRaw = m[m.length - 1];
      break;
    }
  }

  if (looksLikeLatex(exprRaw)) {
    exprLatex = stripDelimiters(exprRaw);
  }
  const exprPlain = exprToPlain(exprRaw);
  const compiled = compilePolarExpression(exprPlain);
  if (!compiled.ok) return compiled;

  const dl = fnPolar(name, exprLatex || exprPlain);
  return {
    ok: true,
    type: 'polar-explicit',
    name,
    expr: exprPlain,
    exprLatex: exprLatex || exprPlain,
    display: `${name}(θ) = ${exprPlain}`,
    displayLatex: dl,
    evaluate: compiled.evaluate,
  };
}

export function compileExpression(expr: string): CompileResult {
  return compile(expr, 'x');
}

export function compilePolarExpression(expr: string): CompileResult {
  return compile(expr, 'θ');
}

function compile(expr: string, variable: string): CompileResult {
  try {
    const js = toJs(expr, variable);
    const varName = variable === 'θ' ? 't' : 'x';
    const fn = new Function(varName, `with (Math) { return (${js}); }`) as (v: number) => number;
    const test = fn(0.5);
    if (typeof test !== 'number' || !Number.isFinite(test)) {
      const test2 = fn(1);
      if (typeof test2 !== 'number' || !Number.isFinite(test2)) {
        return { ok: false, error: '식을 계산할 수 없습니다. 정의역·괄호를 확인하세요.' };
      }
    }
    return {
      ok: true,
      evaluate(v: number) {
        const out = fn(v);
        return Number.isFinite(out) ? out : NaN;
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `식 오류: ${message}` };
  }
}

function toJs(expr: string, variable: string): string {
  let s = expr.trim();
  s = s.replace(/θ/g, 't').replace(/theta/gi, 't');
  if (variable === 'x') s = s.replace(/\bt\b/g, 'x');

  s = s.replace(/\^/g, '**');
  s = s.replace(/\bpi\b/gi, 'PI');
  s = s.replace(/\be\^/gi, 'exp(');

  s = s.replace(/(\d+\.?\d*|\.\d+)e([+-]?\d+)/gi, '($1*10**($2))');

  s = s.replace(/\bln\s*\(/gi, 'log(');
  s = s.replace(/\blog10\s*\(/gi, 'log10(');
  s = s.replace(/\blog\s*\(/gi, 'log10(');
  s = s.replace(/(?<![0-9.])e(?![0-9(])/gi, '(E)');
  s = s.replace(/\bexp\s*\(/gi, 'exp(');
  s = s.replace(/\babs\s*\(/gi, 'abs(');
  s = s.replace(/\bsqrt\s*\(/gi, 'sqrt(');
  s = s.replace(/\bsin\s*\(/gi, 'sin(');
  s = s.replace(/\bcos\s*\(/gi, 'cos(');
  s = s.replace(/\btan\s*\(/gi, 'tan(');
  s = s.replace(/(\d)\s*\(/g, '$1*(');
  s = s.replace(/\)\s*(\d)/g, ')*$1');
  s = s.replace(/\)\s*\(/g, ')*(');
  s = s.replace(/\|([^|]+)\|/g, 'abs($1)');

  const allowed = /^[\d\s.xXtT+\-*/().,a-zA-Z]+$/;
  if (!allowed.test(s)) throw new Error('허용되지 않는 문자');
  return s;
}

export const Parser = {
  NUM,
  normalize,
  parse,
  validate,
  compileExpression,
  compilePolarExpression,
};
