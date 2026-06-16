/* Polynomial least-squares fit for sketch → equation display */
const FitCurve = {
  fitPolynomial(points, maxDegree = 6) {
    if (!points || points.length < 2) return null;

    const n = points.length;
    const degree = Math.min(maxDegree, n - 1, 8);
    if (degree < 1) return null;

    const coeffs = this._leastSquaresPoly(points, degree);
    if (!coeffs) return null;

    const xs = points.map((p) => p.x);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);

    return {
      coeffs,
      degree,
      xMin,
      xMax,
      display: this.formatPolynomial(coeffs, 'y'),
    };
  },

  _leastSquaresPoly(points, degree) {
    const m = degree + 1;
    const n = points.length;
    const A = [];
    const b = [];

    for (let i = 0; i < n; i++) {
      const row = [];
      let xp = 1;
      for (let j = 0; j < m; j++) {
        row.push(xp);
        xp *= points[i].x;
      }
      A.push(row);
      b.push(points[i].y);
    }

    const AtA = Array.from({ length: m }, () => Array(m).fill(0));
    const Atb = Array(m).fill(0);

    for (let i = 0; i < n; i++) {
      for (let r = 0; r < m; r++) {
        Atb[r] += A[i][r] * b[i];
        for (let c = 0; c < m; c++) AtA[r][c] += A[i][r] * A[i][c];
      }
    }

    return this._solveLinear(AtA, Atb);
  },

  _solveLinear(A, b) {
    const n = b.length;
    const aug = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      }
      [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-12) return null;

      for (let j = col; j <= n; j++) aug[col][j] /= pivot;
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = aug[row][col];
        for (let j = col; j <= n; j++) aug[row][j] -= factor * aug[col][j];
      }
    }

    return aug.map((row) => row[n]);
  },

  /** Coefficients below this are omitted from displayed polynomials */
  COEF_DISPLAY_EPS: 1e-4,

  formatTerm(coef, power, variable = 'x') {
    const eps = this.COEF_DISPLAY_EPS;
    if (Math.abs(coef) < eps) return null;

    const abs = Math.abs(coef);
    let coefStr;
    if (power === 0) {
      coefStr = this._fmtNum(abs);
    } else if (Math.abs(abs - 1) < eps) {
      coefStr = '';
    } else {
      coefStr = this._fmtNum(abs);
      if (coefStr === '0') return null;
    }

    let body;
    if (power === 0) body = coefStr;
    else if (power === 1) body = coefStr ? `${coefStr}${variable}` : variable;
    else body = coefStr ? `${coefStr}${variable}^${power}` : `${variable}^${power}`;

    return { negative: coef < 0, body };
  },

  formatPolynomial(coeffs, lhs = '') {
    const parts = [];
    for (let i = coeffs.length - 1; i >= 0; i--) {
      const t = this.formatTerm(coeffs[i], i);
      if (!t) continue;
      parts.push(t);
    }

    if (parts.length === 0) return lhs ? `${lhs} = 0` : '0';

    let expr = '';
    parts.forEach((t, idx) => {
      if (idx === 0) {
        expr = (t.negative ? '−' : '') + t.body;
      } else {
        expr += (t.negative ? ' − ' : ' + ') + t.body;
      }
    });

    return lhs ? `${lhs} = ${expr}` : expr;
  },

  _fmtNum(n) {
    const abs = Math.abs(n);
    if (abs < this.COEF_DISPLAY_EPS) return '0';
    if (Math.abs(n - Math.round(n)) < 1e-5) return String(Math.round(n));
    const s = n.toFixed(4);
    return s.replace(/\.?0+$/, '');
  },

  sampleSketch(points, stepPx = 2) {
    if (!points || points.length < 2) return [];
    const samples = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const pa = toPixelCoord(a.x, a.y);
      const pb = toPixelCoord(b.x, b.y);
      const dist = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const steps = Math.max(2, Math.ceil(dist / stepPx));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        samples.push({
          x: a.x + t * (b.x - a.x),
          y: a.y + t * (b.y - a.y),
        });
      }
    }
    return samples;
  },
};
