/* Command-line parser — Cartesian & polar, normalized syntax */
const Parser = {
  /** Real number literal (integer, decimal, scientific) */
  NUM: '[-+]?(?:\\d+\\.\\d+|\\d+\\.?|\\d*\\.\\d+)(?:[eE][-+]?\\d+)?',

  parse(input) {
    const raw = this.normalize(input);
    if (!raw) return { ok: false, error: '입력이 비어 있습니다.' };

    if (Coords.isPolar()) return this._parsePolar(raw, input);
    return this._parseCartesian(raw, input);
  },

  /** LaTeX·일반식 공통 정규화 */
  normalize(raw) {
    let s = typeof raw === 'string' ? raw.trim() : '';
    s = Latex.stripDelimiters(s);
    s = s.replace(/\s+/g, ' ');
    s = s.replace(/:=/g, '=');
    s = s.replace(/×/g, '*');
    s = s.replace(/÷/g, '/');
    s = s.replace(/·/g, '*');
    s = s.replace(/π/g, 'pi');
    s = s.replace(/φ/g, 'theta');
    s = s.replace(/ℯ/g, 'e');
    s = s.replace(/\*\*/g, '^');
    s = this._normalizeDecimalCommas(s);
    return s;
  },

  /** 2,5 → 2.5 (쉼표 소수). 좌표 (3, 14)처럼 쉼표 뒤 공백이 있으면 유지 */
  _normalizeDecimalCommas(s) {
    return s.replace(/(\d),(\d)/g, '$1.$2');
  },

  validate(input) {
    const raw = this.normalize(input);
    if (!raw) return { ok: false, error: '비어 있음', display: '' };

    try {
      const result = this.parse(raw);
      if (!result.ok) {
        return { ok: false, error: result.error, display: raw };
      }
      const display =
        result.display ||
        (result.type === 'function-explicit'
          ? result.display
          : result.type === 'polar-explicit'
            ? result.display
            : result.type === 'point' && result.name
              ? `${result.name} = (${result.x?.toFixed?.(3) ?? result.x}, ${result.y?.toFixed?.(3) ?? result.y})`
              : raw);
      const displayLatex =
        result.displayLatex ||
        (result.type === 'function-explicit'
          ? Latex.fnCartesian(result.name, result.exprLatex || result.expr)
          : result.type === 'polar-explicit'
            ? Latex.fnPolar(result.name, result.exprLatex || result.expr)
            : result.type === 'point'
              ? result.displayLatex
              : Latex.plainToLatex(display));
      return { ok: true, display, displayLatex, result };
    } catch (e) {
      return { ok: false, error: e.message, display: raw };
    }
  },

  _exprToPlain(exprPart) {
    const t = exprPart.trim();
    return Latex.looksLikeLatex(t) ? Latex.toExpr(t) : t;
  },

  _parseCartesian(raw, originalInput) {
    const pointRe = new RegExp(
      `^([A-Z])\\s*=\\s*\\(\\s*(${this.NUM})\\s*,\\s*(${this.NUM})\\s*\\)$`,
      'i'
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
        displayLatex: Latex.pointCartesian(nm, x, y),
      };
    }

    let name = 'f';
    let exprRaw = raw;
    let exprLatex = null;

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

    if (Latex.looksLikeLatex(exprRaw)) {
      exprLatex = Latex.stripDelimiters(exprRaw);
    }
    const exprPlain = this._exprToPlain(exprRaw);
    const compiled = this.compileExpression(exprPlain);
    if (!compiled.ok) return compiled;

    const dl = Latex.fnCartesian(name, exprLatex || exprPlain);
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
  },

  _parsePolar(raw, originalInput) {
    const polarPtRe = new RegExp(
      `^([A-Z])\\s*=\\s*\\(\\s*(${this.NUM})\\s*[;,]\\s*([^)]+)\\s*\\)$`,
      'i'
    );
    const polarPoint = raw.match(polarPtRe);
    if (polarPoint) {
      try {
        const r = parseFloat(polarPoint[2]);
        const theta = Coords.parseAngle(polarPoint[3]);
        const cart = Coords.toCartesian(r, theta);
        const nm = polarPoint[1].toUpperCase();
        return {
          ok: true,
          type: 'point',
          name: nm,
          x: cart.x,
          y: cart.y,
          polar: { r, theta },
          display: `${nm} = (${Coords.formatR(r)}; ${Coords.formatTheta(theta)})`,
          displayLatex: Latex.pointPolar(nm, r, theta),
        };
      } catch (e) {
        return { ok: false, error: '극좌표 점: A=(r; θ) 예: A=(2; 45°)' };
      }
    }

    const cartPtRe = new RegExp(
      `^([A-Z])\\s*=\\s*\\(\\s*(${this.NUM})\\s*,\\s*(${this.NUM})\\s*\\)$`,
      'i'
    );
    const cartPoint = raw.match(cartPtRe);
    if (cartPoint) {
      const x = parseFloat(cartPoint[2]);
      const y = parseFloat(cartPoint[3]);
      const { r, theta } = Coords.toPolar(x, y);
      const nm = cartPoint[1].toUpperCase();
      return {
        ok: true,
        type: 'point',
        name: nm,
        x,
        y,
        polar: { r, theta },
        display: `${nm} = (${Coords.formatR(r)}; ${Coords.formatTheta(theta)})`,
        displayLatex: Latex.pointPolar(nm, r, theta),
      };
    }

    let name = 'r';
    let exprRaw = raw;
    let exprLatex = null;

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

    if (Latex.looksLikeLatex(exprRaw)) {
      exprLatex = Latex.stripDelimiters(exprRaw);
    }
    const exprPlain = this._exprToPlain(exprRaw);
    const compiled = this.compilePolarExpression(exprPlain);
    if (!compiled.ok) return compiled;

    const dl = Latex.fnPolar(name, exprLatex || exprPlain);
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
  },

  compileExpression(expr) {
    return this._compile(expr, 'x');
  },

  compilePolarExpression(expr) {
    return this._compile(expr, 'θ');
  },

  _compile(expr, variable) {
    try {
      const js = this._toJs(expr, variable);
      const varName = variable === 'θ' ? 't' : 'x';
      const fn = new Function(varName, `with (Math) { return (${js}); }`);
      const test = fn(0.5);
      if (typeof test !== 'number' || !Number.isFinite(test)) {
        const test2 = fn(1);
        if (typeof test2 !== 'number' || !Number.isFinite(test2)) {
          return { ok: false, error: '식을 계산할 수 없습니다. 정의역·괄호를 확인하세요.' };
        }
      }
      return {
        ok: true,
        evaluate(v) {
          const out = fn(v);
          return Number.isFinite(out) ? out : NaN;
        },
      };
    } catch (e) {
      return { ok: false, error: `식 오류: ${e.message}` };
    }
  },

  _toJs(expr, variable) {
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
  },
};
