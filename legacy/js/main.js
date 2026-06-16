/* Application bootstrap and pointer handling */
(function init() {
  const canvas = document.getElementById('graphCanvas');
  Render.init(canvas);
  UI.init();
  initHistory();

  let isPanning = false;
  let panStart = { x: 0, y: 0 };
  let panOrigin = { x: 0, y: 0 };

  function getPointer(e) {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    return { px, py, math: toMathCoord(px, py) };
  }

  function finishActiveStroke() {
    if (App.tool !== 'function') return;
    if (Coords.isPolar()) PolarSketch.finishStroke();
    else Sketch.finishStroke();
  }

  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1 || e.button === 2) {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
      panOrigin = { x: App.panX, y: App.panY };
      canvas.classList.add('panning');
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    const { math } = getPointer(e);

    if (App.tool === 'move') {
      isPanning = true;
      panStart = { x: e.clientX, y: e.clientY };
      panOrigin = { x: App.panX, y: App.panY };
      canvas.classList.add('panning');
      return;
    }

    if (App.tool === 'function') {
      if (Coords.isPolar()) PolarSketch.onPointerDown(math);
      else Sketch.onPointerDown(e, math);
      return;
    }

    if (App.tool === 'point') {
      const name = nextPointName();
      const polar = Coords.toPolar(math.x, math.y);
      const pt = {
        id: generateId(),
        type: 'point',
        name,
        x: math.x,
        y: math.y,
        color: '#e11d48',
      };
      if (Coords.isPolar()) pt.polar = polar;
      addObject(pt);
      UI.refreshAlgebra();
      Render.request();
      return;
    }

    if (App.tool === 'input') {
      UI.selectAt(math);
      if (typeof InputPanel !== 'undefined') InputPanel.focus();
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const { math } = getPointer(e);

    if (isPanning) {
      const dx = (e.clientX - panStart.x) / App.unitScale;
      const dy = (e.clientY - panStart.y) / App.unitScale;
      App.panX = panOrigin.x - dx;
      App.panY = panOrigin.y + dy;
      Render.request();
      return;
    }

    if (App.tool === 'function') {
      if (Coords.isPolar() && PolarSketch.isDrawing) PolarSketch.onPointerMove(math);
      else if (!Coords.isPolar() && Sketch.isDrawing) Sketch.onPointerMove(e, math);
    }
  });

  function endPan() {
    if (isPanning) {
      isPanning = false;
      canvas.classList.remove('panning');
    }
  }

  window.addEventListener('mouseup', () => {
    finishActiveStroke();
    endPan();
  });

  canvas.addEventListener('mouseleave', () => {
    finishActiveStroke();
    endPan();
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const mathBefore = toMathCoord(px, py);

    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    App.unitScale = Math.max(0.001, Math.min(App.unitScale * factor, 100000));

    const mathAfter = toMathCoord(px, py);
    App.panX += mathBefore.x - mathAfter.x;
    App.panY += mathBefore.y - mathAfter.y;

    Render.request();
  }, { passive: false });

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) e.preventDefault();
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      undo();
    } else if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
      e.preventDefault();
      redo();
    } else if (e.ctrlKey && e.key === 'n') {
      e.preventDefault();
      UI.newDocument();
    } else if (e.key === 'Delete' && App.selectedId) {
      UI.handleAction('delete');
    } else if (e.key === 'F2' && App.selectedId) {
      e.preventDefault();
      UI.editSelectedObject();
    } else if (!e.ctrlKey && !e.altKey && document.activeElement !== UI.elements.commandInput) {
      const key = e.key.toLowerCase();
      if (key === 'm') UI.setTool('move');
      else if (key === 'f') UI.setTool('function');
      else if (key === 'p') UI.setTool('point');
      else if (key === 'i') UI.setTool('input');
      else if (key === '1') setCoordMode('cartesian');
      else if (key === '2') setCoordMode('polar');
    }
  });

  Render.request();
})();
