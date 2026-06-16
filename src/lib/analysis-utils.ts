import type { GraphObject } from '@/lib/types';

/** 직교 f(x) 형태로 도함수·정적분 분석 가능한 객체 */
export function isAnalyzableCartesian(obj: GraphObject): boolean {
  if (obj.visible === false) return false;
  if (obj.type === 'function-explicit' && obj.evaluate) return true;
  if (obj.type === 'function-sketch' && obj.equation?.evaluate) return true;
  return false;
}

export function getAnalysisEvaluate(obj: GraphObject): ((x: number) => number) | null {
  if (obj.type === 'function-explicit' && obj.evaluate) return obj.evaluate;
  if (obj.type === 'function-sketch' && obj.equation?.evaluate) return obj.equation.evaluate;
  return null;
}

export function analysisTargetLabel(obj: GraphObject): string {
  if (obj.type === 'function-explicit') return `${obj.name}(x)`;
  if (obj.type === 'function-sketch') return `${obj.name}(x) · 스케치`;
  return obj.name;
}

export function sketchDomain(obj: GraphObject): { min: number; max: number } | null {
  if (obj.type === 'function-sketch' && Number.isFinite(obj.minX) && Number.isFinite(obj.maxX)) {
    return { min: obj.minX, max: obj.maxX };
  }
  return null;
}
