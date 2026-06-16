'use client';

import Link from 'next/link';
import { formatTheta } from '@/lib/coords';
import { useAppStore } from '@/store/useAppStore';
import { useCloudProjectStore } from '@/store/useCloudProjectStore';

function fmtCoord(n: number) {
  if (!Number.isFinite(n)) return '—';
  if (Math.abs(n) >= 1000 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(3);
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return parseFloat(n.toFixed(4)).toString();
}

export default function StatusBar() {
  const hud = useAppStore((s) => s.hud);
  const coordMode = useAppStore((s) => s.coordMode);
  const unitScale = useAppStore((s) => s.unitScale);
  const panX = useAppStore((s) => s.panX);
  const panY = useAppStore((s) => s.panY);
  const objects = useAppStore((s) => s.objects);
  const selectedId = useAppStore((s) => s.selectedId);
  const fitInProgress = useAppStore((s) => s.fitInProgress);
  const tool = useAppStore((s) => s.tool);

  const syncStatus = useCloudProjectStore((s) => s.syncStatus);
  const isDirty = useCloudProjectStore((s) => s.isDirty);
  const projectTitle = useCloudProjectStore((s) => s.currentProjectTitle);

  const selected = objects.find((o) => o.id === selectedId);
  const visibleCount = objects.filter((o) => o.visible !== false).length;
  const isPolar = coordMode === 'polar';

  const cursorLabel = isPolar
    ? hud.visible
      ? `θ=${formatTheta(hud.x)}, r=${fmtCoord(hud.y)}`
      : 'θ=—, r=—'
    : hud.visible
      ? `x=${fmtCoord(hud.x)}, y=${fmtCoord(hud.y)}`
      : 'x=—, y=—';

  const fnLabel =
    hud.fnValue !== null && Number.isFinite(hud.fnValue) ? `f=${fmtCoord(hud.fnValue)}` : null;

  const cloudLabel =
    syncStatus === 'saving'
      ? '클라우드 저장 중…'
      : syncStatus === 'error'
        ? '동기화 오류'
        : isDirty
          ? '변경됨'
          : '클라우드 저장됨';

  return (
    <footer className="status-bar" aria-label="상태 표시줄">
      <div className="status-section status-coords">
        <span className="status-label">{isPolar ? '극좌표' : '직교'}</span>
        <span className="status-value">{cursorLabel}</span>
        {fnLabel && <span className="status-fn">{fnLabel}</span>}
      </div>
      <div className="status-section">
        <span className="status-label">프로젝트</span>
        <Link href="/app/account" className="status-value status-cloud" title={projectTitle}>
          {projectTitle}
        </Link>
        <span className={`status-cloud-badge${syncStatus === 'error' ? ' err' : isDirty ? ' dirty' : ''}`}>
          {cloudLabel}
        </span>
      </div>
      <div className="status-section">
        <span className="status-label">뷰</span>
        <span className="status-value">
          중심 ({fmtCoord(panX)}, {fmtCoord(panY)}) · 배율 {fmtCoord(unitScale)} px/u
        </span>
      </div>
      <div className="status-section status-right">
        {fitInProgress && <span className="status-badge busy">근사 중…</span>}
        {selected && (
          <span className="status-selected" title={selected.id}>
            선택: <strong>{selected.name}</strong>
          </span>
        )}
        <span className="status-objects">
          객체 {visibleCount}/{objects.length}
        </span>
        <span className="status-tool">{tool}</span>
      </div>
    </footer>
  );
}
