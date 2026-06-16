/* Global application state and coordinate transforms */
const App = {
  canvas: null,
  ctx: null,
  centerX: 0,
  centerY: 0,

  unitScale: 50,
  panX: 0,
  panY: 0,

  tool: 'move',
  coordMode: 'cartesian',
  fitMethodCartesian: 'auto',
  fitMethodPolar: 'auto',

  objects: [],
  selectedId: null,
  nextId: 1,
  nameCounters: { f: 0, g: 0, h: 0, p: 0, A: 0 },

  history: [],
  historyIndex: -1,
  maxHistory: 60,

  view: {
    showGrid: true,
    showAxes: true,
  },
};

function generateId() {
  return `obj_${App.nextId++}`;
}

function nextFunctionName() {
  const letters = ['f', 'g', 'h', 'k', 'l', 'm', 'n'];
  for (const letter of letters) {
    if (!App.objects.some((o) => o.name === letter)) return letter;
  }
  App.nameCounters.f += 1;
  return `f${App.nameCounters.f}`;
}

function nextPointName() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const ch of alphabet) {
    if (!App.objects.some((o) => o.type === 'point' && o.name === ch)) return ch;
  }
  App.nameCounters.A += 1;
  return `P${App.nameCounters.A}`;
}

function cloneState() {
  return JSON.parse(JSON.stringify(App.objects));
}

function pushHistory() {
  const snapshot = cloneState();
  if (App.historyIndex < App.history.length - 1) {
    App.history = App.history.slice(0, App.historyIndex + 1);
  }
  App.history.push(snapshot);
  if (App.history.length > App.maxHistory) App.history.shift();
  App.historyIndex = App.history.length - 1;
  if (typeof UI !== 'undefined') UI.updateUndoRedo();
}

function restoreObjectFunctions() {
  for (const obj of App.objects) {
    if (obj.type === 'function-explicit') {
      const src = obj._exprSource || obj.expr;
      if (!src) continue;
      const compiled = Parser.compileExpression(src);
      if (compiled.ok) obj.evaluate = compiled.evaluate;
    }
    if (obj.type === 'polar-explicit') {
      const src = obj._exprSource || obj.expr;
      if (!src) continue;
      const compiled = Parser.compilePolarExpression(src);
      if (compiled.ok) obj.evaluate = compiled.evaluate;
    }
    if (obj.type === 'function-sketch' && obj.points?.length >= 2) {
      obj.minX = obj.points[0].x;
      obj.maxX = obj.points[obj.points.length - 1].x;
    }
    if (obj.type === 'polar-sketch' && obj.polarPoints?.length >= 2) {
      obj.minTheta = obj.polarPoints[0].theta;
      obj.maxTheta = obj.polarPoints[obj.polarPoints.length - 1].theta;
    }
  }
  if (typeof Sketch !== 'undefined') {
    const cs = App.objects.filter((o) => o.type === 'function-sketch');
    Sketch.activeSketchId = cs.length ? cs[cs.length - 1].id : null;
  }
  if (typeof PolarSketch !== 'undefined') {
    const ps = App.objects.filter((o) => o.type === 'polar-sketch');
    PolarSketch.activeSketchId = ps.length ? ps[ps.length - 1].id : null;
  }
}

function setCoordMode(mode) {
  if (mode !== 'cartesian' && mode !== 'polar') return;
  App.coordMode = mode;
  if (typeof Sketch !== 'undefined') Sketch.startNewFunction();
  if (typeof PolarSketch !== 'undefined') PolarSketch.startNew();
  if (typeof UI !== 'undefined') UI.onCoordModeChange(mode);
  if (typeof Render !== 'undefined') Render.request();
  const label = mode === 'polar' ? '극좌표' : '직교좌표';
  showInfo(`${label} 모드로 전환했습니다.`);
}

function undo() {
  if (App.historyIndex <= 0) return false;
  App.historyIndex -= 1;
  App.objects = JSON.parse(JSON.stringify(App.history[App.historyIndex]));
  restoreObjectFunctions();
  App.selectedId = null;
  if (typeof InputPanel !== 'undefined') InputPanel.cancelEdit();
  if (typeof UI !== 'undefined') {
    UI.refreshAlgebra();
    UI.updateUndoRedo();
  }
  if (typeof Render !== 'undefined') Render.request();
  return true;
}

function redo() {
  if (App.historyIndex >= App.history.length - 1) return false;
  App.historyIndex += 1;
  App.objects = JSON.parse(JSON.stringify(App.history[App.historyIndex]));
  restoreObjectFunctions();
  App.selectedId = null;
  if (typeof InputPanel !== 'undefined') InputPanel.cancelEdit();
  if (typeof UI !== 'undefined') {
    UI.refreshAlgebra();
    UI.updateUndoRedo();
  }
  if (typeof Render !== 'undefined') Render.request();
  return true;
}

function initHistory() {
  App.history = [cloneState()];
  App.historyIndex = 0;
}

function toMathCoord(px, py) {
  return {
    x: (px - App.centerX) / App.unitScale + App.panX,
    y: App.panY - (py - App.centerY) / App.unitScale,
  };
}

function toPixelCoord(mx, my) {
  return {
    x: App.centerX + (mx - App.panX) * App.unitScale,
    y: App.centerY - (my - App.panY) * App.unitScale,
  };
}

function calculateStep(scale) {
  const targetPixels = 80;
  const rawStep = targetPixels / scale;
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / Math.pow(10, exponent);
  const niceFraction = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10;
  return niceFraction * Math.pow(10, exponent);
}

function getVisibleBounds() {
  const minX = App.panX - App.centerX / App.unitScale;
  const maxX = App.panX + (App.canvas.width - App.centerX) / App.unitScale;
  const minY = App.panY - (App.canvas.height - App.centerY) / App.unitScale;
  const maxY = App.panY + App.centerY / App.unitScale;
  return { minX, maxX, minY, maxY };
}

function findObject(id) {
  return App.objects.find((o) => o.id === id);
}

function removeObject(id) {
  const idx = App.objects.findIndex((o) => o.id === id);
  if (idx === -1) return false;
  App.objects.splice(idx, 1);
  if (App.selectedId === id) App.selectedId = null;
  pushHistory();
  return true;
}

function addObject(obj) {
  App.objects.push(obj);
  pushHistory();
  return obj;
}

function updateObject(id, patch) {
  const obj = findObject(id);
  if (!obj) return null;
  Object.assign(obj, patch);
  pushHistory();
  return obj;
}

let toastContainer = null;
let lastWarningTime = 0;

const TOAST_LABELS = { info: '알림', warning: '주의', error: '오류' };

function showToast(message, type = 'info') {
  if (!toastContainer) toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;

  if (type === 'warning') {
    const now = Date.now();
    if (now - lastWarningTime < 1200) return;
    lastWarningTime = now;
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const label = document.createElement('span');
  label.className = 'toast-label';
  label.textContent = TOAST_LABELS[type] || TOAST_LABELS.info;

  const text = document.createElement('span');
  text.className = 'toast-message';
  text.textContent = message;

  toast.append(label, text);
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

function showWarning(msg) {
  showToast(msg, 'warning');
}

function showInfo(msg) {
  showToast(msg, 'info');
}

function showError(msg) {
  showToast(msg, 'error');
}
