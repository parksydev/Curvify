'use client';

import { useMemo } from 'react';
import { simpsonIntegral } from '@/engine/analysis/calculus';
import {
  analysisTargetLabel,
  getAnalysisEvaluate,
  isAnalyzableCartesian,
  sketchDomain,
} from '@/lib/analysis-utils';
import { getVisibleBounds } from '@/lib/transform';
import type { GraphObject } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

function fmtNum(n: number) {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return parseFloat(n.toFixed(4)).toString();
}

interface AnalysisPanelProps {
  objects: GraphObject[];
  isPolar: boolean;
  paramSliders?: { name: string; value: number; onChange: (v: number) => void }[];
}

export default function AnalysisPanel({ objects, isPolar, paramSliders }: AnalysisPanelProps) {
  const view = useAppStore((s) => s.view);
  const analysisTargetId = useAppStore((s) => s.analysisTargetId);
  const selectedId = useAppStore((s) => s.selectedId);
  const getViewState = useAppStore((s) => s.getViewState);

  const setAnalysisTarget = useAppStore((s) => s.setAnalysisTarget);
  const toggleView = useAppStore((s) => s.toggleView);
  const setIntegralBounds = useAppStore((s) => s.setIntegralBounds);
  const setIntegralBoundsFromVisible = useAppStore((s) => s.setIntegralBoundsFromVisible);
  const setIntegralBoundsFromDomain = useAppStore((s) => s.setIntegralBoundsFromDomain);
  const selectObject = useAppStore((s) => s.selectObject);

  const analyzable = useMemo(
    () => objects.filter(isAnalyzableCartesian),
    [objects],
  );

  const target = analyzable.find((o) => o.id === analysisTargetId) ?? null;
  const evaluate = target ? getAnalysisEvaluate(target) : null;

  const integralValue = useMemo(() => {
    if (!evaluate || !view.showIntegral) return null;
    const a = view.integralFrom;
    const b = view.integralTo;
    if (a === b) return 0;
    const val = simpsonIntegral(evaluate, a, b, 200);
    return Number.isFinite(val) ? val : null;
  }, [evaluate, view.showIntegral, view.integralFrom, view.integralTo]);

  const rangePreview = useMemo(() => {
    const vb = getVisibleBounds(getViewState());
    const domain = target ? sketchDomain(target) : null;
    const min = domain ? Math.min(domain.min, vb.minX) : vb.minX;
    const max = domain ? Math.max(domain.max, vb.maxX) : vb.maxX;
    const span = max - min || 1;
    const lo = Math.min(view.integralFrom, view.integralTo);
    const hi = Math.max(view.integralFrom, view.integralTo);
    const left = ((lo - min) / span) * 100;
    const width = ((hi - lo) / span) * 100;
    return { min, max, left: Math.max(0, left), width: Math.min(100 - left, Math.max(0, width)) };
  }, [getViewState, target, view.integralFrom, view.integralTo]);

  if (isPolar) {
    return (
      <div className="inspector-panel">
        <div className="inspector-empty">
          <p>극좌표 모드에서는 f(x) 미적분 분석을 사용할 수 없습니다.</p>
          <p className="inspector-empty-hint">직교좌표(1)로 전환한 뒤 함수를 선택하세요.</p>
        </div>
      </div>
    );
  }

  if (analyzable.length === 0) {
    return (
      <div className="inspector-panel">
        <div className="inspector-empty">
          <p>분석할 함수가 없습니다.</p>
          <p className="inspector-empty-hint">명령 창에 f(x)=… 를 입력하거나 손그림 함수를 근사하세요.</p>
        </div>
      </div>
    );
  }

  const pickSelected = () => {
    const sel = objects.find((o) => o.id === selectedId);
    if (sel && isAnalyzableCartesian(sel)) setAnalysisTarget(sel.id);
  };

  return (
    <div className="inspector-panel">
      <section className="inspector-group">
        <header className="inspector-group-header">분석 대상</header>
        <div className="inspector-body">
          <div className="inspector-row">
            <label className="inspector-label" htmlFor="analysisTargetSelect">함수</label>
            <div className="inspector-control inspector-control-split">
              <select
                id="analysisTargetSelect"
                className="inspector-select"
                value={analysisTargetId ?? ''}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setAnalysisTarget(id);
                  if (id) selectObject(id);
                }}
              >
                {!analysisTargetId && <option value="">— 선택 —</option>}
                {analyzable.map((o) => (
                  <option key={o.id} value={o.id}>
                    {analysisTargetLabel(o)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="inspector-btn"
                title="현재 선택 객체를 분석 대상으로"
                disabled={!selectedId || !objects.some((o) => o.id === selectedId && isAnalyzableCartesian(o))}
                onClick={pickSelected}
              >
                선택
              </button>
            </div>
          </div>
          {target && (
            <div className="inspector-row">
              <span className="inspector-label">색상</span>
              <span className="inspector-value">
                <span className="inspector-color-swatch" style={{ background: target.color || '#0072bd' }} />
                {analysisTargetLabel(target)}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="inspector-group">
        <header className="inspector-group-header">그래프 오버레이</header>
        <div className="inspector-body">
          <label className="inspector-check-row">
            <input
              type="checkbox"
              checked={view.showDerivative}
              onChange={(e) => toggleView('showDerivative', e.target.checked)}
            />
            <span className="inspector-check-label">도함수 f′(x)</span>
            <span className="inspector-check-hint">빨간 점선</span>
          </label>
          <label className="inspector-check-row">
            <input
              type="checkbox"
              checked={view.showIntegral}
              onChange={(e) => toggleView('showIntegral', e.target.checked)}
            />
            <span className="inspector-check-label">정적분 영역</span>
            <span className="inspector-check-hint">∫ₐᵇ f(x) dx</span>
          </label>
        </div>
      </section>

      {view.showIntegral && (
        <section className="inspector-group">
          <header className="inspector-group-header">적분 구간</header>
          <div className="inspector-body">
            <div className="inspector-axis-bar" aria-hidden="true">
              <div className="inspector-axis-track">
                <div
                  className="inspector-axis-selection"
                  style={{ left: `${rangePreview.left}%`, width: `${rangePreview.width}%` }}
                />
              </div>
              <div className="inspector-axis-ticks">
                <span>{fmtNum(rangePreview.min)}</span>
                <span>{fmtNum(rangePreview.max)}</span>
              </div>
            </div>

            <div className="inspector-row">
              <label className="inspector-label" htmlFor="integralFrom">하한 a</label>
              <input
                id="integralFrom"
                type="number"
                className="inspector-input"
                step="any"
                value={view.integralFrom}
                onChange={(e) =>
                  setIntegralBounds(parseFloat(e.target.value) || 0, view.integralTo)
                }
              />
            </div>
            <div className="inspector-row">
              <label className="inspector-label" htmlFor="integralTo">상한 b</label>
              <input
                id="integralTo"
                type="number"
                className="inspector-input"
                step="any"
                value={view.integralTo}
                onChange={(e) =>
                  setIntegralBounds(view.integralFrom, parseFloat(e.target.value) || 0)
                }
              />
            </div>

            <div className="inspector-row inspector-row-actions">
              <span className="inspector-label">프리셋</span>
              <div className="inspector-btn-row">
                <button type="button" className="inspector-btn" onClick={() => setIntegralBoundsFromVisible()}>
                  화면 구간
                </button>
                {target && sketchDomain(target) && (
                  <button type="button" className="inspector-btn" onClick={() => setIntegralBoundsFromDomain()}>
                    정의역
                  </button>
                )}
                <button type="button" className="inspector-btn" onClick={() => setIntegralBounds(-1, 1)}>
                  [−1, 1]
                </button>
                <button type="button" className="inspector-btn" onClick={() => setIntegralBounds(0, 1)}>
                  [0, 1]
                </button>
              </div>
            </div>

            {evaluate && (
              <div className="inspector-output">
                <div className="inspector-output-line">
                  <span className="inspector-output-prompt">&gt;&gt;</span>
                  <span className="inspector-output-expr">
                    integral(f, {fmtNum(view.integralFrom)}, {fmtNum(view.integralTo)})
                  </span>
                </div>
                <div className="inspector-output-line">
                  <span className="inspector-output-prompt">ans =</span>
                  <span className="inspector-output-value">
                    {integralValue !== null ? fmtNum(integralValue) : 'NaN'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {paramSliders && paramSliders.length > 0 && (
        <section className="inspector-group">
          <header className="inspector-group-header">매개변수</header>
          <div className="inspector-body">
            {paramSliders.map((p) => (
              <div key={p.name} className="inspector-row inspector-row-slider">
                <label className="inspector-label" htmlFor={`param-${p.name}`}>{p.name}</label>
                <div className="inspector-control inspector-control-slider">
                  <input
                    id={`param-${p.name}`}
                    type="range"
                    min={-10}
                    max={10}
                    step={0.05}
                    value={p.value}
                    onChange={(e) => p.onChange(parseFloat(e.target.value))}
                  />
                  <input
                    type="number"
                    className="inspector-input inspector-input-narrow"
                    step={0.05}
                    value={p.value}
                    onChange={(e) => p.onChange(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!target && (view.showDerivative || view.showIntegral) && (
        <div className="inspector-msg">오버레이를 보려면 분석 대상 함수를 선택하세요.</div>
      )}
    </div>
  );
}
