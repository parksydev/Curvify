/* LaTeX ↔ 계산식 변환 및 KaTeX 렌더링 */
const Latex = {
  looksLikeLatex(s) {
    return /\\[a-zA-Z]+|\^{|\_\{|\\frac|\\sqrt|\$|\\\(|\\\[/.test(s);
  },

  stripDelimiters(s) {
    let t = s.trim();
    t = t.replace(/^\$\$?|\$\$?$/g, '');
    t = t.replace(/^\\\(|\\\)$/g, '');
    t = t.replace(/^\\\[|\\\]$/g, '');
    return t.trim();
  },

  /** LaTeX 수식 → 내부 계산용 문자열 */
  toExpr(latex) {
    let s = this.stripDelimiters(latex);
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
    s = s.replace(/_\{([^{}]+)\}/g, ''); // 첨자 무시

    s = s.replace(/\\,/g, ' ');
    s = s.replace(/\\ /g, ' ');
    s = s.replace(/\\{/g, '{').replace(/\\}/g, '}');

    s = s.replace(/\|([^|]+)\|/g, 'abs($1)');

    return s.trim();
  },

  /** 계산식 → LaTeX (근사·표시용) */
  plainToLatex(plain) {
    if (!plain) return '';
    if (this.looksLikeLatex(plain)) return this.stripDelimiters(plain);

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
  },

  fnCartesian(name, exprLatex) {
    const rhs = this.looksLikeLatex(exprLatex) ? this.stripDelimiters(exprLatex) : this.plainToLatex(exprLatex);
    return `${name}(x) = ${rhs}`;
  },

  fnPolar(name, exprLatex) {
    const rhs = this.looksLikeLatex(exprLatex) ? this.stripDelimiters(exprLatex) : this.plainToLatex(exprLatex);
    return `${name}(\\theta) = ${rhs}`;
  },

  pointCartesian(name, x, y) {
    return `${name} = (${this._numLatex(x)}, ${this._numLatex(y)})`;
  },

  pointPolar(name, r, theta) {
    return `${name} = (${this._numLatex(r)}; ${this._thetaLatex(theta)})`;
  },

  pointCartesianCoords(x, y) {
    return `(${this._numLatex(x)},\\,${this._numLatex(y)})`;
  },

  pointPolarCoords(r, theta) {
    return `(${this._numLatex(r)};\\,${this._thetaLatex(theta)})`;
  },

  _numLatex(n) {
    if (typeof n !== 'number' || !Number.isFinite(n)) return String(n);
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return String(parseFloat(n.toFixed(6))).replace(/\.?0+$/, '');
  },

  _thetaLatex(theta) {
    const deg = (theta * 180) / Math.PI;
    if (Math.abs(deg - Math.round(deg)) < 0.05) return `${Math.round(deg)}^{\\circ}`;
    if (Math.abs(theta - Math.PI / 4) < 0.02) return '\\frac{\\pi}{4}';
    if (Math.abs(theta - Math.PI / 2) < 0.02) return '\\frac{\\pi}{2}';
    if (Math.abs(theta - Math.PI) < 0.02) return '\\pi';
    return `${this._numLatex(deg)}^{\\circ}`;
  },

  render(el, latex, displayMode = false) {
    if (!el) return;
    const tex = this.stripDelimiters(latex);
    if (!tex) {
      el.textContent = '';
      return;
    }
    if (typeof katex !== 'undefined') {
      try {
        katex.render(tex, el, {
          throwOnError: false,
          displayMode,
          output: 'html',
          strict: 'ignore',
        });
        return;
      } catch (_) {
        /* fallback */
      }
    }
    el.textContent = tex;
  },

  renderOrPlain(el, latexOrPlain) {
    const tex = this.looksLikeLatex(latexOrPlain)
      ? this.stripDelimiters(latexOrPlain)
      : this.plainToLatex(latexOrPlain);
    this.render(el, tex, false);
  },
};
