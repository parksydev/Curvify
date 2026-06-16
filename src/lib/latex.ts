/* LaTeX ↔ 계산식 변환 및 KaTeX 렌더링 */
import katex from 'katex';

export function looksLikeLatex(s: string) {
  return /\\[a-zA-Z]+|\^{|\_\{|\\frac|\\sqrt|\$|\\\(|\\\[/.test(s);
}

export function stripDelimiters(s: string) {
  let t = s.trim();
  t = t.replace(/^\$\$?|\$\$?$/g, '');
  t = t.replace(/^\\\(|\\\)$/g, '');
  t = t.replace(/^\\\[|\\\]$/g, '');
  return t.trim();
}

export function toExpr(latex: string) {
  let s = stripDelimiters(latex);
  if (!s) return s;

  s = s.replace(/\\left/g, '').replace(/\\right/g, '');
  s = s.replace(/\\cdot/g, '*').replace(/\\times/g, '*');
  s = s.replace(/\\div/g, '/');

  let guard = 0;
  while (/\\frac\s*\{/.test(s) && guard++ < 30) {
    s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
  }

  s = s.replace(/\\sqrt\s*\[([^\]]*)\]\s*\{([^{}]*)\}/g, '($2)^(1/($1))');
  s = s.replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)');

  const fnMap = [
    'sin', 'cos', 'tan', 'sec', 'csc', 'cot',
    'arcsin', 'arccos', 'arctan',
    'sinh', 'cosh', 'tanh',
    'ln', 'log', 'exp', 'abs',
  ];
  for (const fn of fnMap) {
    s = s.replace(new RegExp(`\\\\${fn}\\s*`, 'g'), `${fn}(`);
  }

  s = s.replace(/\\pi\b/g, 'pi');
  s = s.replace(/\\theta\b/g, 'theta');
  s = s.replace(/\\varphi\b/g, 'theta');
  s = s.replace(/\\e\b/g, 'e');
  s = s.replace(/\^\{([^{}]+)\}/g, '^($1)');
  s = s.replace(/_\{([^{}]+)\}/g, '');
  s = s.replace(/\\,/g, ' ');
  s = s.replace(/\\ /g, ' ');
  s = s.replace(/\\{/g, '{').replace(/\\}/g, '}');
  s = s.replace(/\|([^|]+)\|/g, 'abs($1)');

  return s.trim();
}

export function plainToLatex(plain: string) {
  if (!plain) return '';
  if (looksLikeLatex(plain)) return stripDelimiters(plain);

  let s = plain.trim();
  s = s.replace(/\*\*/g, '^');
  s = s.replace(/\bpi\b/gi, '\\pi');
  s = s.replace(/\btheta\b/gi, '\\theta');

  const fns = ['sin', 'cos', 'tan', 'ln', 'log', 'sqrt', 'abs', 'exp'];
  for (const fn of fns) {
    s = s.replace(new RegExp(`\\b${fn}\\s*\\(`, 'gi'), `\\${fn}\\left(`);
    s = s.replace(new RegExp(`\\b${fn}\\s*\\(`, 'gi'), `\\${fn}(`);
  }
  s = s.replace(/sqrt\(([^)]+)\)/gi, '\\sqrt{$1}');
  s = s.replace(/abs\(([^)]+)\)/gi, '\\left|$1\\right|');
  s = s.replace(/\^\(([^)]+)\)/g, '^{$1}');
  s = s.replace(/\^([-+]?[\d.]+|[a-zA-Z])/g, '^{$1}');
  s = s.replace(/\*/g, ' \\cdot ');
  return s.replace(/\s+/g, ' ').trim();
}

export function fnCartesian(name: string, exprLatex: string) {
  const rhs = looksLikeLatex(exprLatex) ? stripDelimiters(exprLatex) : plainToLatex(exprLatex);
  return `${name}(x) = ${rhs}`;
}

export function fnPolar(name: string, exprLatex: string) {
  const rhs = looksLikeLatex(exprLatex) ? stripDelimiters(exprLatex) : plainToLatex(exprLatex);
  return `${name}(\\theta) = ${rhs}`;
}

export function pointCartesian(name: string, x: number, y: number) {
  return `${name} = (${numLatex(x)}, ${numLatex(y)})`;
}

export function pointPolar(name: string, r: number, theta: number) {
  return `${name} = (${numLatex(r)}; ${thetaLatex(theta)})`;
}

export function pointCartesianCoords(x: number, y: number) {
  return `(${numLatex(x)},\\,${numLatex(y)})`;
}

export function pointPolarCoords(r: number, theta: number) {
  return `(${numLatex(r)};\\,${thetaLatex(theta)})`;
}

function numLatex(n: number) {
  if (!Number.isFinite(n)) return String(n);
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return String(parseFloat(n.toFixed(6))).replace(/\.?0+$/, '');
}

function thetaLatex(theta: number) {
  const deg = (theta * 180) / Math.PI;
  if (Math.abs(deg - Math.round(deg)) < 0.05) return `${Math.round(deg)}^{\\circ}`;
  if (Math.abs(theta - Math.PI / 4) < 0.02) return '\\frac{\\pi}{4}';
  if (Math.abs(theta - Math.PI / 2) < 0.02) return '\\frac{\\pi}{2}';
  if (Math.abs(theta - Math.PI) < 0.02) return '\\pi';
  return `${numLatex(deg)}^{\\circ}`;
}

export function renderKatex(el: HTMLElement | null, latex: string, displayMode = false) {
  if (!el) return;
  const tex = stripDelimiters(latex);
  if (!tex) {
    el.textContent = '';
    return;
  }
  try {
    katex.render(tex, el, {
      throwOnError: false,
      displayMode,
      output: 'html',
      strict: 'ignore',
    });
  } catch {
    el.textContent = tex;
  }
}

export function renderOrPlain(el: HTMLElement | null, latexOrPlain: string) {
  const tex = looksLikeLatex(latexOrPlain)
    ? stripDelimiters(latexOrPlain)
    : plainToLatex(latexOrPlain);
  renderKatex(el, tex, false);
}

export function renderKatexString(latex: string, displayMode = false): string {
  try {
    return katex.renderToString(stripDelimiters(latex), {
      throwOnError: false,
      displayMode,
      strict: 'ignore',
    });
  } catch {
    return latex;
  }
}
