export interface CartesianStrokeState {
  activeSketchId: string | null;
  currentStroke: import('../types').MathPoint[];
  isDrawing: boolean;
  strokeDirection: 0 | 1 | -1;
  lastValidX: number | null;
}

export const initialCartesianStroke = (): CartesianStrokeState => ({
  activeSketchId: null,
  currentStroke: [],
  isDrawing: false,
  strokeDirection: 0,
  lastValidX: null,
});

export interface PolarStrokeState {
  activeSketchId: string | null;
  currentStroke: import('../types').PolarPoint[];
  isDrawing: boolean;
  strokeDirection: 0 | 1 | -1;
  lastValidTheta: number | null;
  lastRawTheta: number | null;
}

export const initialPolarStroke = (): PolarStrokeState => ({
  activeSketchId: null,
  currentStroke: [],
  isDrawing: false,
  strokeDirection: 0,
  lastValidTheta: null,
  lastRawTheta: null,
});
