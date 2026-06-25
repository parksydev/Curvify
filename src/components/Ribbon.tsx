'use client';

import type { Tool } from '@/lib/types';
import { getOptions } from '@/lib/fit-models';

export type RibbonTab = 'home' | 'graph' | 'tools' | 'view' | 'help';

interface RibbonProps {
  activeTab: RibbonTab;
  onTabChange: (tab: RibbonTab) => void;
  tool: Tool;
  isPolar: boolean;
  coordMode: 'cartesian' | 'polar';
  fitMethod: string;
  view: {
    showGrid: boolean;
    showAxes: boolean;
    showSketchOverlay: boolean;
    showDerivative: boolean;
    showIntegral: boolean;
  };
  algebraCollapsed: boolean;
  undoEnabled: boolean;
  redoEnabled: boolean;
  onTool: (t: Tool) => void;
  onCoordMode: (m: 'cartesian' | 'polar') => void;
  onFitMethod: (id: string) => void;
  onAction: (action: string) => void;
  onToggleView: (key: string, value?: boolean) => void;
  onToggleAnalysis: (key: 'showDerivative' | 'showIntegral') => void;
  onToggleAlgebraPanel: (visible: boolean) => void;
  onFocusInput: () => void;
  projectTitle?: string;
  syncLabel?: string;
  userName?: string;
}

const TABS: { id: RibbonTab; label: string }[] = [
  { id: 'home', label: '홈' },
  { id: 'graph', label: '그래프' },
  { id: 'tools', label: '도구' },
  { id: 'view', label: '보기' },
  { id: 'help', label: '도움말' },
];

function RibbonBtn({
  label,
  title,
  onClick,
  active,
  disabled,
  large,
  children,
}: {
  label: string;
  title?: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  large?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`ribbon-btn${large ? ' ribbon-btn-lg' : ''}${active ? ' active' : ''}`}
      title={title || label}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="ribbon-btn-icon">{children}</span>
      <span className="ribbon-btn-label">{label}</span>
    </button>
  );
}

export default function Ribbon({
  activeTab,
  onTabChange,
  tool,
  isPolar,
  coordMode,
  fitMethod,
  view,
  algebraCollapsed,
  undoEnabled,
  redoEnabled,
  onTool,
  onCoordMode,
  onFitMethod,
  onAction,
  onToggleView,
  onToggleAnalysis,
  onToggleAlgebraPanel,
  onFocusInput,
  projectTitle,
  syncLabel,
  userName,
}: RibbonProps) {
  const fitOptions = getOptions(isPolar);

  return (
    <header className="ribbon-bar">
      <div className="ribbon-tabs-row">
        <div className="ribbon-quick-access">
          <button type="button" className="qa-btn" title="저장 (Ctrl+S)" onClick={() => onAction('save')}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 1h8l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V2a1 1 0 011-1zm1 1v3h6V3H4zm0 5v5h8V8H4z" fill="currentColor" />
            </svg>
          </button>
          <button type="button" className="qa-btn" title="실행 취소" disabled={!undoEnabled} onClick={() => onAction('undo')}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 3a5 5 0 014.9 4H14l-3.5 3.5L7 7h1.1A3 3 0 108 5V3z" fill="currentColor" />
            </svg>
          </button>
          <button type="button" className="qa-btn" title="다시 실행" disabled={!redoEnabled} onClick={() => onAction('redo')}>
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 3a5 5 0 00-4.9 4H2l3.5 3.5L9 7H7.9A3 3 0 118 5V3z" fill="currentColor" />
            </svg>
          </button>
        </div>

        <nav className="ribbon-tabs" role="tablist" aria-label="리본 탭">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`ribbon-tab${activeTab === tab.id ? ' active' : ''}`}
              aria-selected={activeTab === tab.id}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="ribbon-title-area">
          <span className="ribbon-app-title">Curvify</span>
          {projectTitle && (
            <span className="ribbon-project-title" title={projectTitle}>
              {projectTitle}
            </span>
          )}
          {syncLabel && <span className="ribbon-sync-badge">{syncLabel}</span>}
          {userName && (
            <a href="/app/account" className="ribbon-user-link" title={`${userName} — 계정 설정`}>
              {userName}
            </a>
          )}
        </div>
      </div>

      <div className="ribbon-panel" role="toolbar">
        {activeTab === 'home' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <RibbonBtn label="새 문서" title="Ctrl+N" onClick={() => onAction('new')} large>
                  <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8 12h8v2H8v-2zm0 4h5v2H8v-2z" fill="currentColor" /></svg>
                </RibbonBtn>
                <RibbonBtn label="저장" title="Ctrl+S — 클라우드 저장" onClick={() => onAction('save')}>
                  <svg viewBox="0 0 24 24"><path d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zm-5 2v4H7V5h5zM7 13h10v6H7v-6z" fill="currentColor" /></svg>
                </RibbonBtn>
                <RibbonBtn label="내 프로젝트" title="클라우드 프로젝트" onClick={() => onAction('cloud-projects')}>
                  <svg viewBox="0 0 24 24"><path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8h-8l-2-2zm-2 16H6V10h2v10zm4 0h-2v-6h2v6zm4 0h-2V8h2v12z" fill="currentColor" /></svg>
                </RibbonBtn>
                <RibbonBtn label="불러오기" title="Ctrl+O — 로컬 JSON" onClick={() => onAction('load')}>
                  <svg viewBox="0 0 24 24"><path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8h-8l-2-2z" fill="currentColor" /></svg>
                </RibbonBtn>
              </div>
              <span className="ribbon-group-label">파일</span>
            </div>
            <div className="ribbon-sep" />
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <RibbonBtn label="이동" title="M" active={tool === 'move'} onClick={() => onTool('move')}>
                  <svg viewBox="0 0 24 24"><path d="M13 6l-3-3-5 5 3 3 2-2v9h2V6l2 2 3-3-5-5-3 3z" fill="currentColor" /></svg>
                </RibbonBtn>
                <RibbonBtn
                  label={isPolar ? '극곡선' : '함수'}
                  title="F"
                  active={tool === 'function'}
                  onClick={() => onTool('function')}
                >
                  <svg viewBox="0 0 24 24"><path d="M3 17c3-6 6-10 9-12 2 4 5 8 9 11-4-2-7-4-9-6-2 3-5 6-9 7z" fill="currentColor" /></svg>
                </RibbonBtn>
                <RibbonBtn label="점" title="P" active={tool === 'point'} onClick={() => onTool('point')}>
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="currentColor" /></svg>
                </RibbonBtn>
                <RibbonBtn
                  label="입력"
                  title="I"
                  active={tool === 'input'}
                  onClick={() => { onTool('input'); onFocusInput(); }}
                >
                  <svg viewBox="0 0 24 24"><path d="M4 6h16v2H4V6zm0 5h10v2H4v-2zm0 5h14v2H4v-2z" fill="currentColor" /></svg>
                </RibbonBtn>
              </div>
              <span className="ribbon-group-label">그리기</span>
            </div>
            <div className="ribbon-sep" />
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <RibbonBtn label="취소" disabled={!undoEnabled} onClick={() => onAction('undo')}>↶</RibbonBtn>
                <RibbonBtn label="다시" disabled={!redoEnabled} onClick={() => onAction('redo')}>↷</RibbonBtn>
                <RibbonBtn label="삭제" title="Del" onClick={() => onAction('delete')}>
                  <svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor" /></svg>
                </RibbonBtn>
              </div>
              <span className="ribbon-group-label">편집</span>
            </div>
          </>
        )}

        {activeTab === 'graph' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-group-items ribbon-group-coord">
                <button
                  type="button"
                  className={`coord-ribbon-btn${coordMode === 'cartesian' ? ' active' : ''}`}
                  onClick={() => onCoordMode('cartesian')}
                >
                  직교 (x, y)
                </button>
                <button
                  type="button"
                  className={`coord-ribbon-btn${coordMode === 'polar' ? ' active' : ''}`}
                  onClick={() => onCoordMode('polar')}
                >
                  극좌표 (r, θ)
                </button>
              </div>
              <span className="ribbon-group-label">좌표계</span>
            </div>
            <div className="ribbon-sep" />
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <label className="ribbon-select-wrap">
                  <span className="ribbon-select-label">근사</span>
                  <select className="ribbon-select" value={fitMethod} onChange={(e) => onFitMethod(e.target.value)}>
                    {fitOptions.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <span className="ribbon-group-label">피팅</span>
            </div>
            <div className="ribbon-sep" />
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <RibbonBtn label="확대" onClick={() => onAction('zoom-in')}>+</RibbonBtn>
                <RibbonBtn label="축소" onClick={() => onAction('zoom-out')}>−</RibbonBtn>
                <RibbonBtn label="맞춤" onClick={() => onAction('zoom-fit')}>⊡</RibbonBtn>
              </div>
              <span className="ribbon-group-label">확대/축소</span>
            </div>
            <div className="ribbon-sep" />
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <RibbonBtn
                  label="도함수"
                  active={view.showDerivative}
                  onClick={() => onToggleAnalysis('showDerivative')}
                >
                  f′
                </RibbonBtn>
                <RibbonBtn
                  label="적분"
                  active={view.showIntegral}
                  onClick={() => onToggleAnalysis('showIntegral')}
                >
                  ∫
                </RibbonBtn>
              </div>
              <span className="ribbon-group-label">미적분</span>
            </div>
          </>
        )}

        {activeTab === 'tools' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <RibbonBtn label="데이터 가져오기" onClick={() => onAction('data-import')} large>
                  <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.5l2.5 3 2.5-3H9v-4h2v4H8z" fill="currentColor" /></svg>
                </RibbonBtn>
                <RibbonBtn label="PNG보내기" onClick={() => onAction('export-png')}>
                  <svg viewBox="0 0 24 24"><path d="M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2zM8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-4.5z" fill="currentColor" /></svg>
                </RibbonBtn>
                <RibbonBtn label="SVG보내기" onClick={() => onAction('export-svg')}>
                  <svg viewBox="0 0 24 24"><path d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v2H8V8zm0 4h8v2H8v-2z" fill="currentColor" /></svg>
                </RibbonBtn>
              </div>
              <span className="ribbon-group-label">데이터</span>
            </div>
          </>
        )}

        {activeTab === 'view' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-group-items ribbon-group-checks">
                <label className="ribbon-check">
                  <input type="checkbox" checked={view.showGrid} onChange={(e) => onToggleView('showGrid', e.target.checked)} />
                  격자
                </label>
                <label className="ribbon-check">
                  <input type="checkbox" checked={view.showAxes} onChange={(e) => onToggleView('showAxes', e.target.checked)} />
                  축
                </label>
                <label className="ribbon-check">
                  <input type="checkbox" checked={view.showSketchOverlay} onChange={(e) => onToggleView('showSketchOverlay', e.target.checked)} />
                  근사 곡선
                </label>
                <label className="ribbon-check">
                  <input type="checkbox" checked={!algebraCollapsed} onChange={(e) => onToggleAlgebraPanel(e.target.checked)} />
                  워크스페이스
                </label>
              </div>
              <span className="ribbon-group-label">표시</span>
            </div>
            <div className="ribbon-sep" />
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <RibbonBtn label="격자" active={view.showGrid} onClick={() => onToggleView('showGrid')}>#</RibbonBtn>
                <RibbonBtn label="축" active={view.showAxes} onClick={() => onToggleView('showAxes')}>⊞</RibbonBtn>
                <RibbonBtn label="곡선" active={view.showSketchOverlay} onClick={() => onToggleView('showSketchOverlay')}>~</RibbonBtn>
              </div>
              <span className="ribbon-group-label">빠른 토글</span>
            </div>
          </>
        )}

        {activeTab === 'help' && (
          <>
            <div className="ribbon-group">
              <div className="ribbon-group-items">
                <RibbonBtn label="사용법" onClick={() => onAction('help')} large>
                  <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" fill="currentColor" /></svg>
                </RibbonBtn>
                <RibbonBtn label="단축키" title="F1" onClick={() => onAction('shortcuts')}>
                  <svg viewBox="0 0 24 24"><path d="M20 5H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2zm-2 4h-4v2h4v2h-4v2h4v2H6v-2h4v-2H6v-2h4V9H6V7h12v2z" fill="currentColor" /></svg>
                </RibbonBtn>
                <RibbonBtn label="정보" onClick={() => onAction('about')}>
                  <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor" /></svg>
                </RibbonBtn>
              </div>
              <span className="ribbon-group-label">도움말</span>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
