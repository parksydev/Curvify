'use client';

import { useMemo } from 'react';
import { simpsonIntegral } from '@/engine/analysis/calculus';
import {
  analysisTargetLabel,
  getAnalysisEvaluate,
  isAnalyzableCartesian,
} from '@/lib/analysis-utils';
import { useAppStore } from '@/store/useAppStore';

function fmtNum(n: number) {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return parseFloat(n.toFixed(3)).toString();
}

export default function AnalysisLegend() {
  const objects = useAppStore((s) => s.objects);
  const view = useAppStore((s) => s.view);
  const analysisTargetId = useAppStore((s) => s.analysisTargetId);
  const coordMode = useAppStore((s) => s.coordMode);

  const target = useMemo(
    () => objects.find((o) => o.id === analysisTargetId && isAnalyzableCartesian(o)),
    [objects, analysisTargetId],
  );

  const evaluate = target ? getAnalysisEvaluate(target!) : null;

  const integralValue = useMemo(() => {
    if (!evaluate || !view.showIntegral) return null;
    const val = simpsonIntegral(evaluate, view.integralFrom, view.integralTo, 200);
    return Number.isFinite(val) ? val : null;
  }, [evaluate, view.showIntegral, view.integralFrom, view.integralTo]);

  if (coordMode === 'polar') return null;
  if (!target) return null;
  if (!view.showDerivative && !view.showIntegral) return null;

  const lo = Math.min(view.integralFrom, view.integralTo);
  const hi = Math.max(view.integralFrom, view.integralTo);

  return (
    <div className="figure-legend" aria-label="분석 오버레이">
      <div className="figure-legend-header">분석 — {analysisTargetLabel(target)}</div>
      <table className="figure-legend-table">
        <tbody>
          {view.showDerivative && (
            <tr>
              <td className="figure-legend-key">f′(x)</td>
              <td className="figure-legend-swatch-cell">
                <span className="figure-legend-line deriv" />
              </td>
              <td className="figure-legend-val">도함수 곡선</td>
            </tr>
          )}
          {view.showIntegral && (
            <tr>
              <td className="figure-legend-key">
                ∫<sub>{fmtNum(lo)}</sub><sup>{fmtNum(hi)}</sup>
              </td>
              <td className="figure-legend-swatch-cell">
                <span className="figure-legend-fill integ" />
              </td>
              <td className="figure-legend-val">
                {integralValue !== null ? fmtNum(integralValue) : '—'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
