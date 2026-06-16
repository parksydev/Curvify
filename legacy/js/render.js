const Render = {
  rafId: null,

  init(canvas) {
    App.canvas = canvas;
    App.ctx = canvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },

  resize() {
    const panel = App.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const w = panel.clientWidth;
    const h = panel.clientHeight;
    App.canvas.width = Math.floor(w * dpr);
    App.canvas.height = Math.floor(h * dpr);
    App.canvas.style.width = `${w}px`;
    App.canvas.style.height = `${h}px`;
    App.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    App.centerX = w / 2;
    App.centerY = h / 2;
    this.request();
  },

  request() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.draw();
    });
  },

  draw() {
    const ctx = App.ctx;
    const w = App.canvas.width / (window.devicePixelRatio || 1);
    const h = App.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (App.view.showGrid) {
      if (Coords.isPolar()) this._drawPolarGrid(ctx, w, h);
      else this._drawCartesianGrid(ctx, w, h);
    }
    if (App.view.showAxes) {
      if (Coords.isPolar()) this._drawPolarAxes(ctx, w, h);
      else this._drawCartesianAxes(ctx, w, h);
    }

    for (const obj of App.objects) {
      const selected = obj.id === App.selectedId;
      switch (obj.type) {
        case 'function-sketch':
          this._drawCartesianPath(ctx, obj.points, obj.color, selected);
          break;
        case 'function-explicit':
          this._drawExplicitCartesian(ctx, obj, selected);
          break;
        case 'polar-sketch':
          this._drawPolarSketch(ctx, obj, selected);
          break;
        case 'polar-explicit':
          this._drawExplicitPolar(ctx, obj, selected);
          break;
        case 'point':
          this._drawPoint(ctx, obj, selected);
          break;
        default:
          break;
      }
    }

    if (Coords.isPolar() && typeof PolarSketch !== 'undefined') {
      PolarSketch.drawPreview(ctx);
    } else if (typeof Sketch !== 'undefined') {
      Sketch.drawPreview(ctx);
    }
  },

  _drawCartesianGrid(ctx, w, h) {
    const majorStep = calculateStep(App.unitScale);
    const minorStep = majorStep / 5;
    const { minX, maxX, minY, maxY } = getVisibleBounds();

    ctx.beginPath();
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;
    for (let x = Math.floor(minX / minorStep) * minorStep; x <= maxX; x += minorStep) {
      const px = toPixelCoord(x, 0).x;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
    }
    for (let y = Math.floor(minY / minorStep) * minorStep; y <= maxY; y += minorStep) {
      const py = toPixelCoord(0, y).y;
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#e0e0e0';
    for (let x = Math.floor(minX / majorStep) * majorStep; x <= maxX; x += majorStep) {
      const px = toPixelCoord(x, 0).x;
      ctx.moveTo(px, 0);
      ctx.lineTo(px, h);
    }
    for (let y = Math.floor(minY / majorStep) * majorStep; y <= maxY; y += majorStep) {
      const py = toPixelCoord(0, y).y;
      ctx.moveTo(0, py);
      ctx.lineTo(w, py);
    }
    ctx.stroke();
  },

  _drawPolarGrid(ctx, w, h) {
    const origin = toPixelCoord(0, 0);
    const rStep = calculateStep(App.unitScale);
    const minorR = rStep / 5;
    const { minX, maxX, minY, maxY } = getVisibleBounds();
    const maxR =
      Math.max(
        Math.hypot(minX, minY),
        Math.hypot(maxX, minY),
        Math.hypot(minX, maxY),
        Math.hypot(maxX, maxY)
      ) + rStep;

    for (let r = minorR; r <= maxR; r += minorR) {
      const px = r * App.unitScale;
      if (px < 8) continue;
      ctx.beginPath();
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      ctx.arc(origin.x, origin.y, px, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let r = rStep; r <= maxR; r += rStep) {
      const px = r * App.unitScale;
      ctx.beginPath();
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.arc(origin.x, origin.y, px, 0, Math.PI * 2);
      ctx.stroke();
    }

    const angleStep = this._calculateAngleStep();
    const minorAngle = angleStep / 2;
    for (let a = 0; a < Math.PI * 2; a += minorAngle) {
      const end = Coords.polarToPixel(maxR, a);
      ctx.beginPath();
      ctx.strokeStyle = '#f0f0f0';
      ctx.lineWidth = 1;
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    for (let a = 0; a < Math.PI * 2; a += angleStep) {
      const end = Coords.polarToPixel(maxR, a);
      ctx.beginPath();
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  },

  _calculateAngleStep() {
    const targetPx = 70;
    const raw = targetPx / App.unitScale;
    const nice = [Math.PI / 12, Math.PI / 8, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2];
    for (const n of nice) {
      if (n >= raw * 0.85) return n;
    }
    return Math.PI / 2;
  },

  _drawCartesianAxes(ctx, w, h) {
    const origin = toPixelCoord(0, 0);
    const majorStep = calculateStep(App.unitScale);
    const precision = Math.max(0, -Math.floor(Math.log10(majorStep)));
    const { minX, maxX, minY, maxY } = getVisibleBounds();

    ctx.beginPath();
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1.5;
    if (origin.y >= 0 && origin.y <= h) {
      ctx.moveTo(0, origin.y);
      ctx.lineTo(w, origin.y);
    }
    if (origin.x >= 0 && origin.x <= w) {
      ctx.moveTo(origin.x, 0);
      ctx.lineTo(origin.x, h);
    }
    ctx.stroke();

    ctx.fillStyle = '#666666';
    ctx.font = '11px "Source Sans 3", sans-serif';

    if (origin.x > 20 && origin.x < w - 4 && origin.y > 4 && origin.y < h - 16) {
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('0', origin.x - 4, origin.y + 4);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = Math.ceil(minX / majorStep); i <= Math.floor(maxX / majorStep); i++) {
      if (i === 0) continue;
      const val = i * majorStep;
      const px = toPixelCoord(val, 0).x;
      if (px < 12 || px > w - 12) continue;
      ctx.fillText(val.toFixed(precision), px, Math.min(Math.max(origin.y + 6, 12), h - 4));
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = Math.ceil(minY / majorStep); i <= Math.floor(maxY / majorStep); i++) {
      if (i === 0) continue;
      const val = i * majorStep;
      const py = toPixelCoord(0, val).y;
      if (py < 12 || py > h - 12) continue;
      ctx.fillText(val.toFixed(precision), Math.min(Math.max(origin.x - 6, 24), w - 4), py);
    }
  },

  _drawPolarAxes(ctx, w, h) {
    const origin = toPixelCoord(0, 0);
    const rStep = calculateStep(App.unitScale);
    const precision = Math.max(0, -Math.floor(Math.log10(rStep)));
    const { minX, maxX, minY, maxY } = getVisibleBounds();
    const maxR =
      Math.max(
        Math.hypot(minX, minY),
        Math.hypot(maxX, minY),
        Math.hypot(minX, maxY),
        Math.hypot(maxX, maxY)
      ) + rStep;

    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1.5;
    const posX = Coords.polarToPixel(maxR * 1.02, 0);
    ctx.beginPath();
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(posX.x, posX.y);
    ctx.stroke();

    const angleStep = this._calculateAngleStep();
    for (let a = 0; a < Math.PI * 2; a += angleStep) {
      const end = Coords.polarToPixel(maxR, a);
      ctx.beginPath();
      ctx.moveTo(origin.x, origin.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    ctx.fillStyle = '#555555';
    ctx.font = '11px "Source Sans 3", sans-serif';

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const rLabel = Coords.polarToPixel(rStep, 0);
    if (rLabel.x > 8 && rLabel.x < w - 8) {
      ctx.fillText(rStep.toFixed(precision), rLabel.x + 4, rLabel.y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const labelR = maxR * 0.92;
    for (let a = 0; a < Math.PI * 2; a += angleStep) {
      if (Math.abs(a) < 0.05 || Math.abs(a - Math.PI) < 0.05) continue;
      const lp = Coords.polarToPixel(labelR, a);
      if (lp.x < 16 || lp.x > w - 16 || lp.y < 12 || lp.y > h - 12) continue;
      ctx.fillText(this._thetaLabel(a), lp.x, lp.y);
    }

    ctx.fillStyle = '#4a86c7';
    ctx.font = '600 12px "Source Sans 3", sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('θ', origin.x - 6, origin.y + 6);
    ctx.textAlign = 'left';
    ctx.fillText('r', posX.x + 4, posX.y - 6);
  },

  _thetaLabel(theta) {
    const deg = Math.round((theta * 180) / Math.PI);
    const map = {
      0: '0°',
      45: '45°',
      90: '90°',
      135: '135°',
      180: '180°',
      225: '225°',
      270: '270°',
      315: '315°',
      30: '30°',
      60: '60°',
      120: '120°',
      150: '150°',
      210: '210°',
      240: '240°',
      300: '300°',
      330: '330°',
    };
    if (map[deg]) return map[deg];
    if (deg % 15 === 0) return `${deg}°`;
    const piN = Math.round((theta / Math.PI) * 4);
    if (Math.abs(theta - (piN * Math.PI) / 4) < 0.02) {
      if (piN === 0) return '0';
      if (piN === 4) return 'π';
      if (piN === 2) return 'π/2';
      if (piN === -4) return '−π';
      return `${piN > 0 ? '' : '−'}${Math.abs(piN) === 1 ? 'π/4' : `${Math.abs(piN)}π/4`}`;
    }
    return `${deg}°`;
  },

  _drawCartesianPath(ctx, points, color, selected, width = 2.5) {
    if (!points || points.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = color || '#2563eb';
    ctx.lineWidth = selected ? width + 1 : width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const start = toPixelCoord(points[0].x, points[0].y);
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < points.length; i++) {
      const p = toPixelCoord(points[i].x, points[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    if (selected) {
      ctx.strokeStyle = 'rgba(74, 134, 199, 0.35)';
      ctx.lineWidth = width + 4;
      ctx.stroke();
    }
  },

  _drawPolarSketch(ctx, obj, selected) {
    if (!obj.polarPoints?.length) return;
    const cart = obj.polarPoints.map((p) => Coords.polarPointToCartesian(p));
    this._drawCartesianPath(ctx, cart, obj.color || '#7c3aed', selected);
  },

  _drawExplicitCartesian(ctx, obj, selected) {
    const { minX, maxX } = getVisibleBounds();
    const step = (maxX - minX) / (App.canvas.clientWidth || 800);
    const pts = [];
    let lastValid = null;

    for (let x = minX; x <= maxX; x += step) {
      const y = obj.evaluate(x);
      if (!Number.isFinite(y)) {
        if (pts.length >= 2) this._drawCartesianPath(ctx, pts, obj.color, selected);
        pts.length = 0;
        lastValid = null;
        continue;
      }
      if (lastValid !== null && Math.abs(y - lastValid) > 50) {
        if (pts.length >= 2) this._drawCartesianPath(ctx, pts, obj.color, selected);
        pts.length = 0;
      }
      pts.push({ x, y });
      lastValid = y;
    }
    if (pts.length >= 2) this._drawCartesianPath(ctx, pts, obj.color, selected);
  },

  _drawExplicitPolar(ctx, obj, selected) {
    const steps = Math.max(360, Math.floor((App.canvas.clientWidth || 800) * 1.2));
    const pts = [];
    let segment = [];

    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI * 2;
      let r = obj.evaluate(theta);
      if (!Number.isFinite(r)) {
        if (segment.length >= 2) pts.push(segment);
        segment = [];
        continue;
      }
      let t = theta;
      if (r < 0) {
        r = -r;
        t += Math.PI;
      }
      const cart = Coords.toCartesian(r, t);
      if (segment.length && Math.hypot(cart.x - segment[segment.length - 1].x, cart.y - segment[segment.length - 1].y) > 8) {
        pts.push(segment);
        segment = [];
      }
      segment.push(cart);
    }
    if (segment.length >= 2) pts.push(segment);

    for (const seg of pts) {
      this._drawCartesianPath(ctx, seg, obj.color || '#7c3aed', selected);
    }
  },

  _drawPoint(ctx, obj, selected) {
    const p = toPixelCoord(obj.x, obj.y);
    const r = selected ? 6 : 5;
    ctx.beginPath();
    ctx.fillStyle = obj.color || '#e11d48';
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = selected ? '#4a86c7' : '#fff';
    ctx.lineWidth = selected ? 2 : 1.5;
    ctx.stroke();

    ctx.font = '12px "Source Sans 3", sans-serif';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    let label = obj.name;
    if (Coords.isPolar() && obj.polar) {
      label += ` (${Coords.formatR(obj.polar.r)}; ${Coords.formatTheta(obj.polar.theta)})`;
    }
    ctx.fillText(label, p.x + 8, p.y - 4);
  },

  exportPng() {
    return App.canvas.toDataURL('image/png');
  },
};
