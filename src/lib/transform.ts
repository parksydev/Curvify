import type { ViewState } from './types';

export function toMathCoord(view: ViewState, px: number, py: number) {
  return {
    x: (px - view.centerX) / view.unitScale + view.panX,
    y: view.panY - (py - view.centerY) / view.unitScale,
  };
}

export function toPixelCoord(view: ViewState, mx: number, my: number) {
  return {
    x: view.centerX + (mx - view.panX) * view.unitScale,
    y: view.centerY - (my - view.panY) * view.unitScale,
  };
}

export function calculateStep(scale: number) {
  const targetPixels = 80;
  const rawStep = targetPixels / scale;
  const exponent = Math.floor(Math.log10(rawStep));
  const fraction = rawStep / Math.pow(10, exponent);
  const niceFraction = fraction < 1.5 ? 1 : fraction < 3.5 ? 2 : fraction < 7.5 ? 5 : 10;
  return niceFraction * Math.pow(10, exponent);
}

export function getVisibleBounds(view: ViewState) {
  const minX = view.panX - view.centerX / view.unitScale;
  const maxX = view.panX + (view.canvasWidth - view.centerX) / view.unitScale;
  const minY = view.panY - (view.canvasHeight - view.centerY) / view.unitScale;
  const maxY = view.panY + view.centerY / view.unitScale;
  return { minX, maxX, minY, maxY };
}

export { numericDerivative, sampleDefiniteIntegral } from '@/engine/analysis';
