import type { CoordMode, PolarPoint } from './types';
import { toCartesian, toPolar } from '@/engine/geometry';
import { toMathCoord, toPixelCoord } from './transform';
import type { ViewState } from './types';
import { looksLikeLatex, toExpr } from './latex';

export { toPolar, toCartesian, polarPointToCartesian, unwrapTheta } from '@/engine/geometry';

export function isPolarMode(mode: CoordMode) {
  return mode === 'polar';
}

export function fromPixelPolar(view: ViewState, px: number, py: number): PolarPoint {
  const { x, y } = toMathCoord(view, px, py);
  return toPolar(x, y);
}

export function polarToPixel(view: ViewState, r: number, theta: number) {
  const { x, y } = toCartesian(r, theta);
  return toPixelCoord(view, x, y);
}

export function formatTheta(theta: number) {
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
}

export function formatR(r: number) {
  if (Math.abs(r - Math.round(r)) < 1e-4) return String(Math.round(r));
  return r.toFixed(3).replace(/\.?0+$/, '');
}

export function parseAngle(str: string) {
  let s = str.trim();
  if (looksLikeLatex(s)) s = toExpr(s);
  s = s.replace(/(\d),(\d)/g, '$1.$2');
  const degMatch = s.match(/^([-+]?(?:\d+\.\d+|\d+\.|\.\d+|\d+)(?:[eE][-+]?\d+)?)\s*°?$/);
  if (degMatch) return (parseFloat(degMatch[1]) * Math.PI) / 180;
  const js = s.replace(/\^/g, '**').replace(/\bpi\b/gi, 'PI');
  const fn = new Function(`with(Math){return (${js});}`);
  const v = fn();
  if (!Number.isFinite(v)) throw new Error('각도 형식 오류');
  return v;
}
