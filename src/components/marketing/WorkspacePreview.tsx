/**
 * Static workspace chrome for marketing — mirrors /app IDE layout without app state.
 */
export default function WorkspacePreview() {
  return (
    <div className="ws-preview" aria-label="Curvify workspace preview">
      <div className="ws-preview-ribbon">
        <div className="ws-preview-tabs">
          {['홈', '그래프', '도구', '보기', '도움말'].map((tab, i) => (
            <span key={tab} className={i === 0 ? 'active' : ''}>
              {tab}
            </span>
          ))}
        </div>
        <div className="ws-preview-panel">
          <div className="ws-preview-tool active" title="함수">
            <span className="ws-preview-tool-icon">ƒ</span>
            <span>함수</span>
          </div>
          <div className="ws-preview-tool" title="스케치">
            <span className="ws-preview-tool-icon">✎</span>
            <span>스케치</span>
          </div>
          <div className="ws-preview-tool" title="점">
            <span className="ws-preview-tool-icon">•</span>
            <span>점</span>
          </div>
          <div className="ws-preview-sep" />
          <div className="ws-preview-tool" title="피팅">
            <span className="ws-preview-tool-icon">∿</span>
            <span>피팅</span>
          </div>
        </div>
      </div>

      <div className="ws-preview-navbar">
        <span className="ws-preview-project">Figure 1 — damped oscillation</span>
        <span className="ws-preview-sync">저장됨</span>
      </div>

      <div className="ws-preview-body">
        <div className="ws-preview-canvas-wrap">
          <div className="ws-preview-canvas">
            <div className="ws-preview-grid" />
            <svg className="ws-preview-curve" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
              <path
                d="M 20 150 Q 60 170 100 110 T 180 70 T 260 90 T 380 35"
                fill="none"
                stroke="#0072bd"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M 20 148 Q 62 168 102 108 T 182 68 T 262 88 T 378 33"
                fill="none"
                stroke="#d95319"
                strokeWidth="1.5"
                strokeDasharray="5 4"
                opacity="0.75"
              />
            </svg>
          </div>
        </div>

        <aside className="ws-preview-algebra">
          <div className="ws-preview-algebra-head">대수</div>
          <div className="ws-preview-algebra-item active">
            <span className="ws-preview-swatch" />
            <span>f(x) = 0.12x³ − 1.4x² + 4.2x + 1.8</span>
          </div>
          <div className="ws-preview-algebra-item">
            <span className="ws-preview-swatch sketch" />
            <span>스케치 1</span>
          </div>
          <div className="ws-preview-fit-badge">R² = 0.998</div>
        </aside>
      </div>

      <div className="ws-preview-status">
        <span>준비</span>
        <span>데카르트</span>
        <span>줌 100%</span>
      </div>
    </div>
  );
}
