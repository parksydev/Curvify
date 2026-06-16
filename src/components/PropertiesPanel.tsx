'use client';

import { formatTheta } from '@/lib/coords';
import type { GraphObject } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

const PRESET_COLORS = ['#2563eb', '#059669', '#7c3aed', '#e11d48', '#d97706', '#0891b2', '#64748b'];

function fmtNum(n: number) {
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return n.toFixed(3).replace(/\.?0+$/, '');
}

interface PropertiesPanelProps {
  obj: GraphObject | null;
  isPolar: boolean;
}

export default function PropertiesPanel({ obj, isPolar }: PropertiesPanelProps) {
  const renameObject = useAppStore((s) => s.renameObject);
  const setObjectColor = useAppStore((s) => s.setObjectColor);
  const toggleObjectVisibility = useAppStore((s) => s.toggleObjectVisibility);
  const refitSelectedSketch = useAppStore((s) => s.refitSelectedSketch);
  const setAnalysisTarget = useAppStore((s) => s.setAnalysisTarget);
  const fitInProgress = useAppStore((s) => s.fitInProgress);

  if (!obj) {
    return (
      <div className="properties-empty">
        <p>객체를 선택하면 속성이 표시됩니다.</p>
        <p className="properties-hint">대수 목록 또는 그래프에서 클릭하세요.</p>
      </div>
    );
  }

  const isSketch = obj.type === 'function-sketch' || obj.type === 'polar-sketch';
  const isExplicit = obj.type === 'function-explicit' || obj.type === 'polar-explicit';
  const visible = obj.visible !== false;

  return (
    <div className="properties-panel">
      <div className="prop-row">
        <label htmlFor="prop-name">이름</label>
        <input
          id="prop-name"
          type="text"
          maxLength={8}
          defaultValue={obj.name}
          key={obj.id + obj.name}
          onBlur={(e) => {
            if (e.target.value.trim() !== obj.name) renameObject(obj.id, e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
        />
      </div>

      <div className="prop-row">
        <span className="prop-label">유형</span>
        <span className="prop-value">{typeLabel(obj.type)}</span>
      </div>

      <div className="prop-row">
        <span className="prop-label">표시</span>
        <button
          type="button"
          className={`prop-visibility${visible ? '' : ' hidden-obj'}`}
          onClick={() => toggleObjectVisibility(obj.id)}
          title={visible ? '숨기기' : '표시'}
        >
          {visible ? '👁 표시 중' : '👁‍🗨 숨김'}
        </button>
      </div>

      <div className="prop-row prop-colors">
        <span className="prop-label">색상</span>
        <div className="color-swatches">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`color-swatch${obj.color === c ? ' active' : ''}`}
              style={{ background: c }}
              title={c}
              aria-label={`색상 ${c}`}
              onClick={() => setObjectColor(obj.id, c)}
            />
          ))}
          <input
            type="color"
            className="color-picker"
            value={obj.color || '#2563eb'}
            onChange={(e) => setObjectColor(obj.id, e.target.value)}
            title="사용자 색상"
          />
        </div>
      </div>

      {obj.type === 'function-sketch' && (
        <>
          <div className="prop-row">
            <span className="prop-label">정의역</span>
            <span className="prop-value">
              x ∈ [{fmtNum(obj.minX)}, {fmtNum(obj.maxX)}]
            </span>
          </div>
          <div className="prop-row">
            <span className="prop-label">스케치 점</span>
            <span className="prop-value">{obj.points.length}점</span>
          </div>
        </>
      )}

      {obj.type === 'polar-sketch' && (
        <>
          <div className="prop-row">
            <span className="prop-label">θ 구간</span>
            <span className="prop-value">
              [{formatTheta(obj.minTheta)}, {formatTheta(obj.maxTheta)}]
            </span>
          </div>
          <div className="prop-row">
            <span className="prop-label">스케치 점</span>
            <span className="prop-value">{obj.polarPoints.length}점</span>
          </div>
        </>
      )}

      {obj.type === 'point' && (
        <div className="prop-row">
          <span className="prop-label">좌표</span>
          <span className="prop-value">
            ({fmtNum(obj.x)}, {fmtNum(obj.y)})
          </span>
        </div>
      )}

      {isSketch && obj.equation && (
        <div className="prop-section">
          <h5>근사</h5>
          <div className="prop-row">
            <span className="prop-label">방법</span>
            <span className="prop-value">{obj.equation.methodLabel || obj.equation.method}</span>
          </div>
          {obj.equation.rSquared !== undefined && (
            <div className="prop-row">
              <span className="prop-label">R²</span>
              <span className="prop-value">{obj.equation.rSquared.toFixed(5)}</span>
            </div>
          )}
          {obj.equation.diagnostics?.rmse !== undefined && (
            <div className="prop-row">
              <span className="prop-label">RMSE</span>
              <span className="prop-value">{obj.equation.diagnostics.rmse.toExponential(3)}</span>
            </div>
          )}
          <button
            type="button"
            className="btn-prop-action"
            disabled={fitInProgress}
            onClick={() => refitSelectedSketch()}
          >
            다시 근사 (Ctrl+R)
          </button>
        </div>
      )}

      {isExplicit || isSketch ? (
        <div className="prop-section">
          <button
            type="button"
            className="btn-prop-action"
            onClick={() => {
              setAnalysisTarget(obj.id);
              useAppStore.setState({ sidePanelTab: 'analysis', algebraCollapsed: false });
            }}
          >
            분석 대상으로 설정
          </button>
        </div>
      ) : null}
    </div>
  );
}

function typeLabel(type: GraphObject['type']): string {
  switch (type) {
    case 'function-sketch':
      return '손그림 함수';
    case 'polar-sketch':
      return '손그림 극곡선';
    case 'function-explicit':
      return '함수 f(x)';
    case 'polar-explicit':
      return '극함수 r(θ)';
    case 'point':
      return '점';
    default:
      return type;
  }
}
