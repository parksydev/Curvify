const Sketch = {
  activeSketchId: null,
  currentStroke: [],
  isDrawing: false,
  strokeDirection: 0,
  lastValidX: null,

  getActiveSketch() {
    if (!this.activeSketchId) return null;
    return findObject(this.activeSketchId);
  },

  getBezierPoints(pA, pB) {
    if (Math.abs(pA.x - pB.x) < 0.0001) return [];

    const pxA = toPixelCoord(pA.x, pA.y);
    const pxB = toPixelCoord(pB.x, pB.y);
    const dist = Math.hypot(pxB.x - pxA.x, pxB.y - pxA.y);
    const numPoints = Math.max(10, Math.min(200, Math.floor(dist / 2)));

    const dx = pB.x - pA.x;
    const cp1 = { x: pA.x + dx / 2, y: pA.y };
    const cp2 = { x: pB.x - dx / 2, y: pB.y };

    const points = [];
    for (let i = 1; i <= numPoints; i++) {
      const t = i / (numPoints + 1);
      const u = 1 - t;
      const x =
        u * u * u * pA.x +
        3 * u * u * t * cp1.x +
        3 * u * t * t * cp2.x +
        t * t * t * pB.x;
      const y =
        u * u * u * pA.y +
        3 * u * u * t * cp1.y +
        3 * u * t * t * cp2.y +
        t * t * t * pB.y;
      points.push({ x, y });
    }
    return points;
  },

  isOverlapping(sketch, x) {
    if (!sketch || !sketch.points.length) return false;
    return x >= sketch.minX && x <= sketch.maxX;
  },

  isCrossingInterval(sketch, x1, x2) {
    if (!sketch || !sketch.points.length) return false;
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    return Math.max(minX, sketch.minX) <= Math.min(maxX, sketch.maxX);
  },

  ensureActiveSketch() {
    let sketch = this.getActiveSketch();
    if (sketch) return sketch;

    const name = nextFunctionName();
    sketch = {
      id: generateId(),
      type: 'function-sketch',
      name,
      points: [],
      minX: Infinity,
      maxX: -Infinity,
      color: '#2563eb',
      equation: null,
    };
    App.objects.push(sketch);
    this.activeSketchId = sketch.id;
    return sketch;
  },

  finalizeSketchEquation(sketch) {
    FitModels.applyCartesianSketch(sketch);
  },

  finishStroke() {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    if (this.currentStroke.length < 2) {
      showWarning('점만 찍을 수는 없습니다. 선을 이어서 그려주세요.');
      this.currentStroke = [];
      Render.request();
      return;
    }

    if (this.currentStroke[0].x > this.currentStroke[this.currentStroke.length - 1].x) {
      this.currentStroke.reverse();
    }

    const sketch = this.ensureActiveSketch();
    const pts = sketch.points;

    if (pts.length === 0) {
      sketch.points = [...this.currentStroke];
    } else {
      const leftEdge = pts[0].x;
      const rightEdge = pts[pts.length - 1].x;

      if (this.currentStroke[this.currentStroke.length - 1].x <= leftEdge) {
        const bez = this.getBezierPoints(
          this.currentStroke[this.currentStroke.length - 1],
          pts[0]
        );
        sketch.points = this.currentStroke.concat(bez, pts);
        showInfo('베지어 곡선으로 구간을 부드럽게 연결했습니다.');
      } else if (this.currentStroke[0].x >= rightEdge) {
        const bez = this.getBezierPoints(pts[pts.length - 1], this.currentStroke[0]);
        sketch.points = pts.concat(bez, this.currentStroke);
        showInfo('베지어 곡선으로 구간을 부드럽게 연결했습니다.');
      } else {
        showWarning('새 구간은 기존 그래프의 왼쪽 또는 오른쪽에만 이을 수 있습니다.');
        this.currentStroke = [];
        Render.request();
        return;
      }
    }

    sketch.minX = sketch.points[0].x;
    sketch.maxX = sketch.points[sketch.points.length - 1].x;
    this.finalizeSketchEquation(sketch);

    this.currentStroke = [];
    pushHistory();
    UI.refreshAlgebra();
    Render.request();
  },

  onPointerDown(e, mathPos) {
    const sketch = this.getActiveSketch();

    if (sketch && this.isOverlapping(sketch, mathPos.x)) {
      showWarning('이미 그래프가 그려진 X 구간입니다.');
      return;
    }

    this.isDrawing = true;
    this.strokeDirection = 0;
    this.currentStroke = [mathPos];
    this.lastValidX = mathPos.x;
    Render.request();
  },

  onPointerMove(e, mathPos) {
    if (!this.isDrawing) return;
    const sketch = this.getActiveSketch();

    if (mathPos.x === this.lastValidX) return;

    if (this.strokeDirection === 0) {
      this.strokeDirection = mathPos.x > this.lastValidX ? 1 : -1;
    }

    if (
      (this.strokeDirection === 1 && mathPos.x < this.lastValidX) ||
      (this.strokeDirection === -1 && mathPos.x > this.lastValidX)
    ) {
      showWarning('함수는 한 방향으로만 진행되어야 합니다.');
      return;
    }

    if (sketch && this.isCrossingInterval(sketch, this.lastValidX, mathPos.x)) {
      showWarning('기존 그래프와 겹칠 수 없습니다.');
      this.finishStroke();
      return;
    }

    this.currentStroke.push(mathPos);
    this.lastValidX = mathPos.x;
    Render.request();
  },

  drawPreview(ctx) {
    const stroke = this.currentStroke;
    if (!stroke.length) return;

    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([6, 4]);
    const start = toPixelCoord(stroke[0].x, stroke[0].y);
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < stroke.length; i++) {
      const p = toPixelCoord(stroke[i].x, stroke[i].y);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  },

  startNewFunction() {
    this.activeSketchId = null;
    this.currentStroke = [];
    this.isDrawing = false;
  },
};
