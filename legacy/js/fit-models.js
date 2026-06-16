/* Sketch approximation: polynomial + elementary function models */
const FitModels = {
  cartesianOptions: [
    { id: 'auto', label: '자동 (최적)' },
    { id: 'polynomial', label: '다항식' },
    { id: 'trigonometric', label: 'sin / cos 조합' },
    { id: 'exponential', label: '지수 a·e^(bx)' },
    { id: 'power', label: '거듭제곱 a·x^b' },
    { id: 'logarithmic', label: '로그 a + b·ln(x)' },
    { id: 'linear', label: '일차 (ax + b)' },
  ],

  polarOptions: [
    { id: 'auto', label: '자동 (최적)' },
    { id: 'polynomial', label: '다항식 (θ)' },
    { id: 'trigonometric', label: 'sin / cos 조합' },
    { id: 'exponential', label: '지수 a·e^(bθ)' },
    { id: 'linear', label: '일차 (a + b·θ)' },
  ],

  getMethod() {
    return Coords.isPolar() ? App.fitMethodPolar : App.fitMethodCartesian;
  },

  setMethod(id) {
    if (Coords.isPolar()) App.fitMethodPolar = id;
    else App.fitMethodCartesian = id;
  },

  getOptions() {
    return Coords.isPolar() ? this.polarOptions : this.cartesianOptions;
  },

  fitCartesian(samples, method) {
    const m = method || App.fitMethodCartesian;
    if (m === 'auto') return this._autoCartesian(samples);
    return this._fitCartesianByMethod(samples, m);
  },

  fitPolar(samples, method) {
    const m = method || App.fitMethodPolar;
    if (m === 'auto') return this._autoPolar(samples);
    return this._fitPolarByMethod(samples, m);
  },

  applyCartesianSketch(sketch) {
    if (!sketch.points || sketch.points.length < 3) {
      sketch.equation = null;
      sketch.equationDisplay = `${sketch.name}: (${sketch.points?.length || 0}점)`;
      return;
    }
    const samples = FitCurve.sampleSketch(sketch.points, 3);
    const method = App.fitMethodCartesian;
    const fit = this.fitCartesian(samples, method);
    this._attachCartesian(sketch, fit, fit?.method || method);
  },

  applyPolarSketch(sketch) {
    if (!sketch.polarPoints || sketch.polarPoints.length < 3) {
      sketch.equation = null;
      sketch.equationDisplay = `${sketch.name}: (${sketch.polarPoints?.length || 0}점)`;
      return;
    }
    const samples = sketch.polarPoints.map((p) => ({ x: p.theta, y: p.r }));
    const method = App.fitMethodPolar;
    const fit = this.fitPolar(samples, method);
    this._attachPolar(sketch, fit, fit?.method || method);
  },

  refitAll() {
    for (const obj of App.objects) {
      if (obj.type === 'function-sketch') this.applyCartesianSketch(obj);
      if (obj.type === 'polar-sketch') this.applyPolarSketch(obj);
    }
  },

  _attachCartesian(sketch, fit, method) {
    const usedMethod = fit?.method || method;
    sketch.fitMethod = usedMethod;
    if (!fit) {
      sketch.equation = null;
      sketch.equationDisplay = `${sketch.name} = 스케치 (${sketch.points.length}점)`;
      return;
    }
    sketch.equation = fit;
    const rhs = fit.display.replace(/^y\s*=\s*/, '');
    sketch.equationDisplay = `${sketch.name}(x) ≈ ${rhs}`;
    sketch.equationDisplayLatex = `${sketch.name}(x) \\approx ${Latex.plainToLatex(rhs)}`;
  },

  _attachPolar(sketch, fit, method) {
    const usedMethod = fit?.method || method;
    sketch.fitMethod = usedMethod;
    if (!fit) {
      sketch.equation = null;
      sketch.equationDisplay = `${sketch.name}(θ) = 스케치`;
      return;
    }
    sketch.equation = fit;
    const rhs = fit.display.replace(/^r\s*=\s*/, '');
    sketch.equationDisplay = `${sketch.name}(θ) ≈ ${rhs}`;
    sketch.equationDisplayLatex = `${sketch.name}(\\theta) \\approx ${Latex.plainToLatex(rhs)}`;
  },

  _autoCartesian(samples) {
    const methods = ['linear', 'polynomial', 'trigonometric', 'exponential', 'power', 'logarithmic'];
    return this._pickBest(samples, methods, (s, m) => this._fitCartesianByMethod(s, m));
  },

  _autoPolar(samples) {
    const methods = ['linear', 'polynomial', 'trigonometric', 'exponential'];
    return this._pickBest(samples, methods, (s, m) => this._fitPolarByMethod(s, m));
  },

  _pickBest(samples, methods, fitter) {
    let best = null;
    for (const m of methods) {
      const fit = fitter(samples, m);
      if (!fit) continue;
      if (!best || fit.rSquared > best.rSquared) best = fit;
    }
    if (best) best.methodLabel = this._methodLabel(best.method);
    return best;
  },

  _fitCartesianByMethod(samples, method) {
    switch (method) {
      case 'polynomial':
        return this._wrapPolyResult(samples, FitCurve.fitPolynomial(samples, 6), 'polynomial');
      case 'trigonometric':
        return this._fourier(samples, 'x', 4, 'trigonometric');
      case 'exponential':
        return this._exponential(samples, 'x', 'exponential');
      case 'power':
        return this._power(samples, 'x');
      case 'logarithmic':
        return this._logarithmic(samples, 'x');
      case 'linear':
        return this._linear(samples, 'x');
      default:
        return null;
    }
  },

  _fitPolarByMethod(samples, method) {
    switch (method) {
      case 'polynomial': {
        const p = FitCurve.fitPolynomial(samples, 6);
        if (!p) return null;
        const predict = (t) => {
          let y = 0;
          let tp = 1;
          for (let i = 0; i < p.coeffs.length; i++) {
            y += p.coeffs[i] * tp;
            tp *= t;
          }
          return y;
        };
        const rhs = p.display.replace(/^y\s*=\s*/, '');
        return {
          method: 'polynomial',
          methodLabel: this._methodLabel('polynomial'),
          display: `r = ${rhs}`,
          evaluate: predict,
          rSquared: this._rSquared(samples, predict),
        };
      }
      case 'trigonometric':
        return this._fourier(samples, 'θ', 4, 'trigonometric', 'r');
      case 'exponential':
        return this._exponential(samples, 'θ', 'exponential', 'r');
      case 'linear':
        return this._linear(samples, 'θ', 'r');
      default:
        return null;
    }
  },

  _wrapPolyResult(samples, poly, method) {
    if (!poly) return null;
    const predict = (x) => {
      let y = 0;
      let xp = 1;
      for (let i = 0; i < poly.coeffs.length; i++) {
        y += poly.coeffs[i] * xp;
        xp *= x;
      }
      return y;
    };
    return {
      method,
      methodLabel: this._methodLabel(method),
      display: poly.display,
      evaluate: predict,
      rSquared: this._rSquared(samples, predict),
      coeffs: poly.coeffs,
    };
  },

  _fourier(samples, variable, harmonics, method, lhs = 'y') {
    const bases = [{ fn: () => 1, fmt: (c) => (Math.abs(c) < FitCurve.COEF_DISPLAY_EPS ? null : this._fmtNum(c)) }];
    for (let k = 1; k <= harmonics; k++) {
      const kk = k;
      const v =
        kk === 1 ? variable : `${kk}*${variable}`;
      bases.push({
        fn: (x) => Math.sin(kk * x),
        fmt: (c) => this._fmtTrigTerm(c, `sin(${v})`),
      });
      bases.push({
        fn: (x) => Math.cos(kk * x),
        fmt: (c) => this._fmtTrigTerm(c, `cos(${v})`),
      });
    }
    const fit = this._linearCombination(samples, bases);
    if (!fit) return null;
    const display = lhs === 'r' ? `r = ${fit.expr}` : `y = ${fit.expr}`;
    return {
      method,
      methodLabel: this._methodLabel(method),
      display,
      evaluate: fit.evaluate,
      rSquared: fit.rSquared,
    };
  },

  _linear(samples, variable, lhs = 'y') {
    const fit = this._linearCombination(samples, [
      { fn: () => 1, fmt: (c) => (Math.abs(c) < FitCurve.COEF_DISPLAY_EPS ? null : this._fmtNum(c)) },
      { fn: (v) => v, fmt: (c) => this._fmtLinTerm(c, variable) },
    ]);
    if (!fit) return null;
    const display = lhs === 'r' ? `r = ${fit.expr}` : `y = ${fit.expr}`;
    return {
      method: 'linear',
      methodLabel: this._methodLabel('linear'),
      display,
      evaluate: fit.evaluate,
      rSquared: fit.rSquared,
    };
  },

  _exponential(samples, variable, method, lhs = 'y') {
    const valid = samples.filter((p) => p.y > 1e-8);
    if (valid.length < 3) return null;
    const logPts = valid.map((p) => ({ x: p.x, y: Math.log(p.y) }));
    const lin = this._linearCombination(logPts, [
      { fn: () => 1, fmt: () => null },
      { fn: (v) => v, fmt: (c) => this._fmtLinTerm(c, variable) },
    ]);
    if (!lin) return null;
    const a = Math.exp(lin.coeffs[0]);
    const b = lin.coeffs[1];
    const predict = (v) => a * Math.exp(b * v);
    const expr = `${this._fmtNum(a)}·e^(${this._fmtNum(b)}·${variable})`;
    const display = lhs === 'r' ? `r = ${expr}` : `y = ${expr}`;
    return {
      method: 'exponential',
      methodLabel: this._methodLabel('exponential'),
      display,
      evaluate: predict,
      rSquared: this._rSquared(samples, predict),
    };
  },

  _power(samples, variable) {
    const valid = samples.filter((p) => p.x > 1e-8 && p.y > 1e-8);
    if (valid.length < 3) return null;
    const logPts = valid.map((p) => ({ x: Math.log(p.x), y: Math.log(p.y) }));
    const lin = this._linearCombination(logPts, [
      { fn: () => 1, fmt: () => null },
      { fn: (v) => v, fmt: (c) => this._fmtLinTerm(c, `ln(${variable})`) },
    ]);
    if (!lin) return null;
    const a = Math.exp(lin.coeffs[0]);
    const b = lin.coeffs[1];
    const predict = (v) => (v > 0 ? a * Math.pow(v, b) : NaN);
    return {
      method: 'power',
      methodLabel: this._methodLabel('power'),
      display: `y = ${this._fmtNum(a)}·${variable}^${this._fmtNum(b)}`,
      evaluate: predict,
      rSquared: this._rSquared(samples, predict),
    };
  },

  _logarithmic(samples, variable) {
    const valid = samples.filter((p) => p.x > 1e-8);
    if (valid.length < 3) return null;
    const fit = this._linearCombination(valid, [
      { fn: () => 1, fmt: (c) => (Math.abs(c) < FitCurve.COEF_DISPLAY_EPS ? null : this._fmtNum(c)) },
      { fn: (v) => Math.log(v), fmt: (c) => this._fmtLinTerm(c, `ln(${variable})`) },
    ]);
    if (!fit) return null;
    return {
      method: 'logarithmic',
      methodLabel: this._methodLabel('logarithmic'),
      display: `y = ${fit.expr}`,
      evaluate: fit.evaluate,
      rSquared: fit.rSquared,
    };
  },

  _linearCombination(samples, bases) {
    const n = samples.length;
    const m = bases.length;
    if (n < m) return null;

    const AtA = Array.from({ length: m }, () => Array(m).fill(0));
    const Atb = Array(m).fill(0);

    for (const p of samples) {
      const row = bases.map((b) => b.fn(p.x));
      for (let i = 0; i < m; i++) {
        Atb[i] += row[i] * p.y;
        for (let j = 0; j < m; j++) AtA[i][j] += row[i] * row[j];
      }
    }

    const coeffs = FitCurve._solveLinear(AtA, Atb);
    if (!coeffs) return null;

    const terms = [];
    bases.forEach((b, i) => {
      const t = b.fmt(coeffs[i]);
      if (t) terms.push({ c: coeffs[i], text: t });
    });

    return {
      coeffs,
      expr: this._joinTerms(terms),
      evaluate: (x) => {
        let y = 0;
        for (let i = 0; i < m; i++) y += coeffs[i] * bases[i].fn(x);
        return y;
      },
      rSquared: 0,
    };
  },

  _rSquared(samples, predict) {
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
  },

  _joinTerms(terms) {
    if (!terms.length) return '0';
    let s = '';
    terms.forEach((t, i) => {
      const neg = t.c < 0;
      const body = t.text.startsWith('−') ? t.text.slice(1) : t.text;
      if (i === 0) s = (neg ? '−' : '') + body;
      else s += (neg ? ' − ' : ' + ') + body;
    });
    return s.trim();
  },

  _fmtTrigTerm(c, fnStr) {
    if (Math.abs(c) < FitCurve.COEF_DISPLAY_EPS) return null;
    const abs = Math.abs(c);
    const coef = Math.abs(abs - 1) < 1e-5 ? '' : this._fmtNum(abs);
    const body = coef ? `${coef}·${fnStr}` : fnStr;
    return (c < 0 ? '−' : '') + body;
  },

  _fmtLinTerm(c, varPart) {
    if (Math.abs(c) < FitCurve.COEF_DISPLAY_EPS) return null;
    const abs = Math.abs(c);
    const coef = Math.abs(abs - 1) < 1e-5 ? '' : this._fmtNum(abs);
    const body = coef ? `${coef}·${varPart}` : varPart;
    return (c < 0 ? '−' : '') + body;
  },

  _fmtNum(n) {
    const eps = FitCurve.COEF_DISPLAY_EPS;
    if (Math.abs(n) < eps) return '0';
    if (Math.abs(n - Math.round(n)) < 1e-5) return String(Math.round(n));
    return n.toFixed(4).replace(/\.?0+$/, '');
  },

  _methodLabel(id) {
    const all = [...this.cartesianOptions, ...this.polarOptions];
    return all.find((o) => o.id === id)?.label || id;
  },
};

// Patch _linearCombination to set rSquared after evaluate is built
(function patchLinearCombination() {
  const orig = FitModels._linearCombination.bind(FitModels);
  FitModels._linearCombination = function (samples, bases) {
    const result = orig(samples, bases);
    if (result) result.rSquared = FitModels._rSquared(samples, result.evaluate);
    return result;
  };
})();
