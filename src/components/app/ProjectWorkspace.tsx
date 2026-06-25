'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import AuthLoadingScreen from '@/components/auth/AuthLoadingScreen';
import Workbench from '@/components/Workbench';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCloudProjectStore } from '@/store/useCloudProjectStore';

function formatRelativeTime(iso: string | null) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return new Date(iso).toLocaleString();
}

export default function ProjectPickerDialog() {
  const open = useCloudProjectStore((s) => s.pickerOpen);
  const setOpen = useCloudProjectStore((s) => s.setPickerOpen);
  const projects = useCloudProjectStore((s) => s.projects);
  const currentProjectId = useCloudProjectStore((s) => s.currentProjectId);
  const loadProjectById = useCloudProjectStore((s) => s.loadProjectById);
  const createAndOpen = useCloudProjectStore((s) => s.createAndOpen);
  const removeProject = useCloudProjectStore((s) => s.removeProject);
  const refreshProjectList = useCloudProjectStore((s) => s.refreshProjectList);
  const isDirty = useCloudProjectStore((s) => s.isDirty);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      void refreshProjectList();
      el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open, refreshProjectList]);

  const close = () => setOpen(false);

  const handleCreate = async () => {
    setBusy(true);
    try {
      await createAndOpen(newTitle.trim() || 'Untitled');
      setNewTitle('');
      close();
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async (id: string) => {
    if (id === currentProjectId) {
      close();
      return;
    }
    if (isDirty && !confirm('Unsaved changes will be saved before switching. Continue?')) return;
    setBusy(true);
    try {
      if (isDirty) await useCloudProjectStore.getState().saveCurrent();
      await loadProjectById(id);
      close();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await removeProject(id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog ref={dialogRef} className="cloud-picker-dialog" onClose={close}>
      <div className="cloud-picker-header">
        <h2>My projects</h2>
        <button type="button" className="panel-close" onClick={close} aria-label="Close">
          ×
        </button>
      </div>

      <div className="cloud-picker-create">
        <input
          type="text"
          placeholder="New project name…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
        />
        <button type="button" className="btn-primary" disabled={busy} onClick={() => void handleCreate()}>
          New project
        </button>
      </div>

      <ul className="cloud-picker-list">
        {projects.length === 0 && (
          <li className="cloud-picker-empty">No cloud projects yet. Create one above.</li>
        )}
        {projects.map((p) => (
          <li key={p.id} className={p.id === currentProjectId ? 'active' : undefined}>
            <button type="button" className="cloud-picker-item" disabled={busy} onClick={() => void handleOpen(p.id)}>
              <strong>{p.title}</strong>
              <span>Updated {formatRelativeTime(p.updatedAt)}</span>
            </button>
            <button
              type="button"
              className="cloud-picker-delete"
              disabled={busy}
              title="Delete"
              onClick={() => void handleDelete(p.id, p.title)}
            >
              🗑
            </button>
          </li>
        ))}
      </ul>
    </dialog>
  );
}

export function ProjectWorkspace() {
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const bootstrapped = useCloudProjectStore((s) => s.bootstrapped);
  const syncStatus = useCloudProjectStore((s) => s.syncStatus);
  const errorMessage = useCloudProjectStore((s) => s.errorMessage);
  const projects = useCloudProjectStore((s) => s.projects);
  const currentProjectId = useCloudProjectStore((s) => s.currentProjectId);
  const bootstrap = useCloudProjectStore((s) => s.bootstrap);
  const resetBootstrap = useCloudProjectStore((s) => s.resetBootstrap);
  const markDirty = useCloudProjectStore((s) => s.markDirty);
  const saveCurrent = useCloudProjectStore((s) => s.saveCurrent);
  const isDirty = useCloudProjectStore((s) => s.isDirty);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialized && user && !bootstrapped) {
      void bootstrap();
    }
  }, [initialized, user, bootstrapped, bootstrap]);

  useEffect(() => {
    const unsub = useAppStore.subscribe((state, prev) => {
      if (state.objects !== prev.objects || state.historyIndex !== prev.historyIndex) {
        markDirty();
      }
    });
    return unsub;
  }, [markDirty]);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (useCloudProjectStore.getState().isDirty) {
        void saveCurrent();
      }
    }, 30_000);
  }, [saveCurrent]);

  useEffect(() => {
    if (isDirty && user) scheduleAutoSave();
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [isDirty, user, scheduleAutoSave]);

  const handleRetryBootstrap = () => {
    resetBootstrap();
    void bootstrap();
  };

  if (!initialized || (user && !bootstrapped)) {
    return (
      <AuthLoadingScreen
        message="워크스페이스 불러오는 중…"
        submessage="클라우드 프로젝트를 준비합니다."
      />
    );
  }

  if (user && syncStatus === 'loading') {
    return (
      <AuthLoadingScreen
        message="프로젝트 불러오는 중…"
        submessage="저장된 그래프를 복원합니다."
      />
    );
  }

  if (
    user &&
    syncStatus === 'error' &&
    errorMessage &&
    projects.length === 0 &&
    !currentProjectId
  ) {
    return (
      <div className="auth-loading">
        <div className="workspace-error-card">
          <h2>워크스페이스를 불러오지 못했습니다</h2>
          <p>{errorMessage}</p>
          <div className="workspace-error-actions">
            <button type="button" className="btn-primary" onClick={handleRetryBootstrap}>
              다시 시도
            </button>
            <button
              type="button"
              className="btn-input-cancel"
              onClick={() => {
                resetBootstrap();
                useAppStore.getState().newDocument();
                useCloudProjectStore.setState({
                  bootstrapped: true,
                  syncStatus: 'saved',
                  errorMessage: null,
                  isDirty: false,
                });
              }}
            >
              빈 문서로 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Workbench />
      <ProjectPickerDialog />
    </>
  );
}
