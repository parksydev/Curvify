import { evalPchip, type PchipSpline } from './pchip';
import type { FitModelData } from '../types';

export type { FitModelData } from '../types';

export function rebuildEvaluate(data: FitModelData): (x: number) => number {
  switch (data.type) {
    case 'polynomial':
      return (x) => {
        let y = 0;
        let xp = 1;
        for (const c of data.coeffs) {
          y += c * xp;
          xp *= x;
        }
        return y;
      };
    case 'linear':
      return (x) => data.intercept + data.slope * x;
    case 'pchip': {
      const spline: PchipSpline = { xs: data.xs, ys: data.ys, ms: data.ms };
      return (x) => evalPchip(spline, x);
    }
    case 'fourier':
      return (x) => {
        let y = data.c0;
        for (const t of data.terms) {
          y += t.sin * Math.sin(t.k * x) + t.cos * Math.cos(t.k * x);
        }
        return y;
      };
    case 'exponential':
      return (x) => data.a * Math.exp(data.b * x);
    case 'power':
      return (x) => (x > 0 ? data.a * Math.pow(x, data.b) : NaN);
    case 'logarithmic':
      return (x) => (x > 0 ? data.intercept + data.slope * Math.log(x) : NaN);
  }
}
