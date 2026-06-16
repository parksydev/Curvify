/* Polar curve sketching: r = f(θ), θ monotone */
const PolarSketch = {
  activeSketchId: null,
  currentStroke: [],
  isDrawing: false,
  strokeDirection: 0,
  lastValidTheta: null,
  lastRawTheta: null,

  getActiveSketch() {
    if (!this.activeSketchId) return null;
    return findObject(this.activeSketchId);
  },

  getBezierPolar(pA, pB) {
    if (Math.abs(pA.theta - pB.theta) < 1e-6) return [];

    const pxA = Coords.polarToPixel(pA.r, pA.theta);
    const pxB = Coords.polarToPixel(pB.r, pB.theta);
    const dist = Math.hypot(pxB.x - pxA.x, pxB.y - pxA.y);
    const numPoints = Math.max(10, Math.min(200, Math.floor(dist / 2)));

    const dT = pB.theta - pA.theta;
    const cp1 = { theta: pA.theta + dT / 2, r: pA.r };
    const cp2 = { theta: pB.theta - dT / 2, r: pB.r };

    const points = [];
    for (let i = 1; i <= numPoints; i++) {
      const t = i / (numPoints + 1);
      const u = 1 - t;
      const theta =
        u * u * u * pA.theta +
        3 * u * u * t * cp1.theta +
        3 * u * t * t * cp2.theta +
        t * t * t * pB.theta;
      const r =
        u * u * u * pA.r +
        3 * u * u * t * cp1.r +
        3 * u * t * t * cp2.r +
        t * t * t * pB.r;
      points.push({ theta, r });
    }
    return points;
  },

  isOverlapping(sketch, theta) {
    if (!sketch?.polarPoints?.length) return false;
    return theta >= sketch.minTheta && theta <= sketch.maxTheta;
  },

  isCrossingInterval(sketch, t1, t2) {
    if (!sketch?.polarPoints?.length) return false;
    const minT = Math.min(t1, t2);
    const maxT = Math.max(t1, t2);
    return Math.max(minT, sketch.minTheta) <= Math.min(maxT, sketch.maxTheta);
  },

  ensureActiveSketch() {
    let sketch = this.getActiveSketch();
    if (sketch) return sketch;

    const name = nextFunctionName();
    sketch = {
      id: generateId(),
      type: 'polar-sketch',
      name,
      polarPoints: [],
      minTheta: Infinity,
      maxTheta: -Infinity,
      color: '#7c3aed',
      equation: null,
    };
    App.objects.push(sketch);
    this.activeSketchId = sketch.id;
    return sketch;
  },

  finalizeEquation(sketch) {
    FitModels.applyPolarSketch(sketch);
  },

  finishStroke() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentStroke.length < 2) {
      showWarning('점만 찍을 수는 없습니다. 곡선을 이어서 그려주세요.');
      this.currentStroke = [];
      Render.request();
      return;
    }

    if (
      this.currentStroke[0].theta >
      this.currentStroke[this.currentStroke.length - 1].theta
    ) {
      this.currentStroke.reverse();
    }

    const sketch = this.ensureActiveSketch();
    const pts = sketch.polarPoints;

    if (pts.length === 0) {
      sketch.polarPoints = [...this.currentStroke];
    } else {
      const left = pts[0].theta;
      const right = pts[pts.length - 1].theta;

      if (this.currentStroke[this.currentStroke.length - 1].theta <= left) {
        const bez = this.getBezierPolar(
          this.currentStroke[this.currentStroke.length - 1],
          pts[0]
        );
        sketch.polarPoints = this.currentStroke.concat(bez, pts);
        showInfo('베지어 곡선으로 θ 구간을 부드럽게 연결했습니다.');
      } else if (this.currentStroke[0].theta >= right) {
        const bez = this.getBezierPolar(pts[pts.length - 1], this.currentStroke[0]);
        sketch.polarPoints = pts.concat(bez, this.currentStroke);
        showInfo('베지어 곡선으로 θ 구간을 부드럽게 연결했습니다.');
      } else {
        showWarning('새 구간은 기존 곡선의 θ 범위 앞뒤에만 이을 수 있습니다.');
        this.currentStroke = [];
        Render.request();
        return;
      }
    }

    sketch.minTheta = sketch.polarPoints[0].theta;
    sketch.maxTheta = sketch.polarPoints[sketch.polarPoints.length - 1].theta;
    this.finalizeEquation(sketch);

    this.currentStroke = [];
    this.lastRawTheta = null;
    pushHistory();
    UI.refreshAlgebra();
    Render.request();
  },

  addPolarSample(rawTheta, r) {
    const theta =
      this.lastValidTheta === null
        ? rawTheta
        : Coords.unwrapTheta(this.lastValidTheta, rawTheta);

    if (this.strokeDirection === 0) {
      this.strokeDirection = theta > this.lastValidTheta ? 1 : -1;
    }

    if (this.lastValidTheta !== null) {
      if (
        (this.strokeDirection === 1 && theta < this.lastValidTheta) ||
        (this.strokeDirection === -1 && theta > this.lastValidTheta)
      ) {
        showWarning('θ는 한 방향으로만 증가(또는 감소)해야 합니다.');
        return false;
      }
    }

    if (r < 0) {
      showWarning('반지름 r은 0 이상이어야 합니다.');
      return false;
    }

    this.currentStroke.push({ theta, r });
    this.lastValidTheta = theta;
    this.lastRawTheta = rawTheta;
    return true;
  },

  onPointerDown(mathPos) {
    const { r, theta } = Coords.toPolar(mathPos.x, mathPos.y);
    const sketch = this.getActiveSketch();

    if (sketch && this.isOverlapping(sketch, theta)) {
      showWarning('이미 그려진 θ 구간입니다.');
      return;
    }

    this.isDrawing = true;
    this.strokeDirection = 0;
    this.currentStroke = [];
    this.lastValidTheta = null;
    this.lastRawTheta = null;

    this.addPolarSample(theta, r);
    Render.request();
  },

  onPointerMove(mathPos) {
    if (!this.isDrawing) return;
    const sketch = this.getActiveSketch();
    const { r, theta: rawTheta } = Coords.toPolar(mathPos.x, mathPos.y);

    if (this.lastRawTheta !== null && Math.abs(rawTheta - this.lastRawTheta) < 1e-5) return;

    const theta =
      this.lastValidTheta === null
        ? rawTheta
        : Coords.unwrapTheta(this.lastValidTheta, rawTheta);

    if (sketch && this.isCrossingInterval(sketch, this.lastValidTheta, theta)) {
      showWarning('기존 곡선과 θ 구간이 겹칠 수 없습니다.');
      this.finishStroke();
      return;
    }

    if (!this.addPolarSample(rawTheta, r)) return;
    Render.request();
  },

  drawPreview(ctx) {
    const stroke = this.currentStroke;
    if (stroke.length < 1) return;

    const cartPts = stroke.map((p) => Coords.polarPointToCartesian(p));
    ctx.beginPath();
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([6, 4]);
    const start = toPixelCoord(cartPts[0].x, cartPts[0].y);
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < cartPts.length; i++) {
      const p = toPixelCoord(cartPts[i].x, cartPts[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  },

  startNew() {
    this.activeSketchId = null;
    this.currentStroke = [];
    this.isDrawing = false;
    this.lastValidTheta = null;
    this.lastRawTheta = null;
  },
};
