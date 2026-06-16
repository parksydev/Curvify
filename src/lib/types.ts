export type CoordMode = 'cartesian' | 'polar';
export type Tool = 'move' | 'function' | 'point' | 'input';
export type ToastType = 'info' | 'warning' | 'error';

export interface MathPoint {
  x: number;
  y: number;
}

export interface PolarPoint {
  theta: number;
  r: number;
}

export interface FitEquation {
  method: string;
  methodLabel?: string;
  display: string;
  rSquared?: number;
  coeffs?: number[];
  diagnostics?: {
    conditionNumber?: number;
    degree?: number;
    warning?: string;
    rmse?: number;
    maxResidual?: number;
    sampleCount?: number;
    knotCount?: number;
  };
  /** Serialized as null in JSON; restored on load */
  evaluate?: (x: number) => number;
}

export interface BaseObject {
  id: string;
  name: string;
  color: string;
  /** false면 캔버스에서 숨김 (대수 목록에는 표시). */
  visible?: boolean;
}

export interface FunctionSketch extends BaseObject {
  type: 'function-sketch';
  points: MathPoint[];
  minX: number;
  maxX: number;
  equation: FitEquation | null;
  equationDisplay?: string;
  equationDisplayLatex?: string;
  fitMethod?: string;
}

export interface PolarSketch extends BaseObject {
  type: 'polar-sketch';
  polarPoints: PolarPoint[];
  minTheta: number;
  maxTheta: number;
  equation: FitEquation | null;
  equationDisplay?: string;
  equationDisplayLatex?: string;
  fitMethod?: string;
}

export interface FunctionExplicit extends BaseObject {
  type: 'function-explicit';
  expr: string;
  exprLatex?: string;
  display: string;
  displayLatex?: string;
  _exprSource?: string;
  evaluate?: (x: number) => number;
  /** Runtime parameter overrides for sliders */
  paramValues?: Record<string, number>;
}

export interface PolarExplicit extends BaseObject {
  type: 'polar-explicit';
  expr: string;
  exprLatex?: string;
  display: string;
  displayLatex?: string;
  _exprSource?: string;
  evaluate?: (theta: number) => number;
  paramValues?: Record<string, number>;
}

export interface GraphPoint extends BaseObject {
  type: 'point';
  x: number;
  y: number;
  polar?: PolarPoint;
  displayLatex?: string;
}

export type GraphObject =
  | FunctionSketch
  | PolarSketch
  | FunctionExplicit
  | PolarExplicit
  | GraphPoint;

export interface ViewState {
  centerX: number;
  centerY: number;
  unitScale: number;
  panX: number;
  panY: number;
  canvasWidth: number;
  canvasHeight: number;
  dpr: number;
}

export interface ViewOptions {
  showGrid: boolean;
  showAxes: boolean;
  showSketchOverlay: boolean;
  showDerivative: boolean;
  showIntegral: boolean;
  integralFrom: number;
  integralTo: number;
}

export interface HudState {
  x: number;
  y: number;
  visible: boolean;
  fnValue: number | null;
}

export interface ProjectDocument {
  version: 1;
  coordMode: CoordMode;
  fitMethodCartesian: string;
  fitMethodPolar: string;
  unitScale: number;
  panX: number;
  panY: number;
  view: ViewOptions;
  objects: SerializableObject[];
  nextId: number;
}

/** JSON-safe object (no evaluate functions) */
export type SerializableObject = Omit<
  GraphObject,
  'evaluate'
> & {
  _exprSource?: string;
  equation?: (Omit<FitEquation, 'evaluate'> & { _exprDisplay?: string }) | null;
};

export interface ParseResultOk {
  ok: true;
  type: 'function-explicit' | 'polar-explicit' | 'point';
  name: string;
  expr?: string;
  exprLatex?: string;
  display?: string;
  displayLatex?: string;
  x?: number;
  y?: number;
  polar?: PolarPoint;
  evaluate?: (v: number) => number;
}

export interface ParseResultErr {
  ok: false;
  error: string;
}

export type ParseResult = ParseResultOk | ParseResultErr;
