/* Coordinate system: Cartesian ↔ Polar */
const Coords = {
  isPolar() {
    return App.coordMode === 'polar';
  },

  isCartesian() {
    return App.coordMode === 'cartesian';
  },

  /** Cartesian (pole-relative) → polar */
  toPolar(x, y) {
    const r = Math.hypot(x, y);
    let theta = Math.atan2(y, x);
    return { r, theta };
  },

  /** Polar → Cartesian (pole-relative) */
  toCartesian(r, theta) {
    return {
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
    };
  },

  /** Screen pixel → pole-relative Cartesian math */
  fromPixel(px, py) {
    return toMathCoord(px, py);
  },

  /** Screen pixel → polar (r, θ) at pole */
  fromPixelPolar(px, py) {
    const { x, y } = toMathCoord(px, py);
    return this.toPolar(x, y);
  },

  /** Polar at pole → screen pixel */
  polarToPixel(r, theta) {
    const { x, y } = this.toCartesian(r, theta);
    return toPixelCoord(x, y);
  },

  /** Cartesian path point for drawing polar (r, θ) */
  polarPointToCartesian(p) {
    return this.toCartesian(p.r, p.theta);
  },

  unwrapTheta(prev, theta) {
    if (prev === null || prev === undefined) return theta;
    let d = theta - prev;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return prev + d;
  },

  formatTheta(theta) {
    const deg = (theta * 180) / Math.PI;
    if (Math.abs(deg - Math.round(deg)) < 0.05) return `${Math.round(deg)}°`;
    const piRatio = theta / Math.PI;
    if (Math.abs(piRatio - Math.round(piRatio * 4) / 4) < 0.02) {
      const n = Math.round(piRatio * 4);
      if (n === 0) return '0';
      if (n === 4) return '2π';
      if (n === 2) return 'π';
      if (n === 1) return 'π/4';
      if (n === 3) return '3π/4';
      if (n === -2) return '−π';
      return `${n === 1 ? '' : n + '·'}π/4`.replace('·', '');
    }
    return `${deg.toFixed(1)}°`;
  },

  formatR(r) {
    if (Math.abs(r - Math.round(r)) < 1e-4) return String(Math.round(r));
    return r.toFixed(3).replace(/\.?0+$/, '');
  },

  parseAngle(str) {
    let s = str.trim();
    if (typeof Latex !== 'undefined' && Latex.looksLikeLatex(s)) {
      s = Latex.toExpr(s);
    }
    s = s.replace(/(\d),(\d)/g, '$1.$2');
    const degMatch = s.match(/^([-+]?(?:\d+\.\d+|\d+\.|\.\d+|\d+)(?:[eE][-+]?\d+)?)\s*°?$/);
    if (degMatch) return (parseFloat(degMatch[1]) * Math.PI) / 180;
    const js = s.replace(/\^/g, '**').replace(/\bpi\b/gi, 'PI');
    const fn = new Function(`with(Math){return (${js});}`);
    const v = fn();
    if (!Number.isFinite(v)) throw new Error('각도 형식 오류');
    return v;
  },
};

function isPolarMode() {
  return Coords.isPolar();
}
