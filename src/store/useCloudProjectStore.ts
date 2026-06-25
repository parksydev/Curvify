'use client';

import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  parseProjectDocument,
  updateProject,
  type ProjectMeta,
} from '@/lib/supabase/projects';
import { deserializeProject, recompileExplicit, serializeProject } from '@/lib/project';
import type { GraphObject } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

function cloneObjects(objects: GraphObject[]): GraphObject[] {
  return JSON.parse(JSON.stringify(objects)) as GraphObject[];
}

function restoreEvaluators(objects: GraphObject[]) {
  for (const obj of objects) {
    if (obj.type === 'function-explicit' || obj.type === 'polar-explicit') {
      recompileExplicit(obj);
    }
  }
}

interface CloudProjectStore {
  currentProjectId: string | null;
  currentProjectTitle: string;
  projects: ProjectMeta[];
  syncStatus: SyncStatus;
  lastSavedAt: string | null;
  isDirty: boolean;
  pickerOpen: boolean;
  bootstrapped: boolean;
  errorMessage: string | null;

  setPickerOpen: (open: boolean) => void;
  markDirty: () => void;
  bootstrap: () => Promise<void>;
  resetBootstrap: () => void;
  refreshProjectList: () => Promise<void>;
  saveCurrent: () => Promise<void>;
  loadProjectById: (id: string) => Promise<void>;
  createAndOpen: (title?: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  renameCurrent: (title: string) => Promise<void>;
  exportLocal: () => void;
}

export const useCloudProjectStore = create<CloudProjectStore>((set, get) => ({
  currentProjectId: null,
  currentProjectTitle: 'Untitled',
  projects: [],
  syncStatus: 'idle',
  lastSavedAt: null,
  isDirty: false,
  pickerOpen: false,
  bootstrapped: false,
  errorMessage: null,

  setPickerOpen: (open) => set({ pickerOpen: open }),

  markDirty: () => {
    if (!get().isDirty) set({ isDirty: true, syncStatus: 'idle' });
  },

  resetBootstrap: () => {
    set({
      bootstrapped: false,
      syncStatus: 'idle',
      errorMessage: null,
      projects: [],
      currentProjectId: null,
      currentProjectTitle: 'Untitled',
      isDirty: false,
    });
  },

  bootstrap: async () => {
    const userId = useAuthStore.getState().sessionUser?.id;
    if (!userId) {
      set({ bootstrapped: true });
      return;
    }

    set({ syncStatus: 'loading', errorMessage: null });

    try {
      const supabase = createClient();
      const projects = await listProjects(supabase, userId);
      set({ projects });

      if (projects.length > 0) {
        await get().loadProjectById(projects[0].id);
      } else {
        useAppStore.getState().newDocument();
        set({
          currentProjectId: null,
          currentProjectTitle: 'Untitled',
          isDirty: false,
          syncStatus: 'saved',
        });
      }
    } catch (e) {
      set({
        syncStatus: 'error',
        errorMessage: e instanceof Error ? e.message : 'Failed to load projects.',
      });
      useAppStore.getState().addToast('클라우드 프로젝트를 불러오지 못했습니다.', 'error');
    } finally {
      set({ bootstrapped: true });
    }
  },

  refreshProjectList: async () => {
    const userId = useAuthStore.getState().sessionUser?.id;
    if (!userId) return;

    const supabase = createClient();
    const projects = await listProjects(supabase, userId);
    set({ projects });
  },

  saveCurrent: async () => {
    const userId = useAuthStore.getState().sessionUser?.id;
    if (!userId) {
      get().exportLocal();
      return;
    }

    const app = useAppStore.getState();
    const { currentProjectId, currentProjectTitle } = get();
    const doc = serializeProject({
      coordMode: app.coordMode,
      fitMethodCartesian: app.fitMethodCartesian,
      fitMethodPolar: app.fitMethodPolar,
      unitScale: app.unitScale,
      panX: app.panX,
      panY: app.panY,
      view: app.view,
      objects: app.objects,
      nextId: app.nextId,
    });

    set({ syncStatus: 'saving', errorMessage: null });

    try {
      const supabase = createClient();
      let meta: ProjectMeta;

      if (currentProjectId) {
        meta = await updateProject(supabase, currentProjectId, currentProjectTitle, doc);
      } else {
        meta = await createProject(supabase, userId, currentProjectTitle, doc);
      }

      await get().refreshProjectList();

      set({
        currentProjectId: meta.id,
        currentProjectTitle: meta.title,
        lastSavedAt: meta.updatedAt,
        isDirty: false,
        syncStatus: 'saved',
      });

      app.addToast('클라우드에 저장했습니다.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed.';
      set({ syncStatus: 'error', errorMessage: msg });
      app.addToast(msg, 'error');
    }
  },

  loadProjectById: async (id) => {
    set({ syncStatus: 'loading', errorMessage: null });

    try {
      const supabase = createClient();
      const row = await getProject(supabase, id);
      const doc = parseProjectDocument(row.data);
      const restored = deserializeProject(doc);
      restoreEvaluators(restored.objects as GraphObject[]);

      useAppStore.setState({
        coordMode: restored.coordMode,
        fitMethodCartesian: restored.fitMethodCartesian,
        fitMethodPolar: restored.fitMethodPolar,
        unitScale: restored.unitScale,
        panX: restored.panX,
        panY: restored.panY,
        view: restored.view,
        objects: restored.objects as GraphObject[],
        nextId: restored.nextId,
        history: [cloneObjects(restored.objects as GraphObject[])],
        historyIndex: 0,
        selectedId: null,
        editingId: null,
      });

      set({
        currentProjectId: row.id,
        currentProjectTitle: row.title,
        lastSavedAt: row.updated_at,
        isDirty: false,
        syncStatus: 'saved',
        pickerOpen: false,
      });

      useAppStore.getState().addToast(`"${row.title}" 프로젝트를 열었습니다.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Load failed.';
      set({ syncStatus: 'error', errorMessage: msg });
      useAppStore.getState().addToast(msg, 'error');
    }
  },

  createAndOpen: async (title = 'Untitled') => {
    useAppStore.getState().newDocument();
    set({
      currentProjectId: null,
      currentProjectTitle: title,
      isDirty: true,
      syncStatus: 'idle',
      pickerOpen: false,
    });
    await get().saveCurrent();
  },

  removeProject: async (id) => {
    const supabase = createClient();
    await deleteProject(supabase, id);

    const { currentProjectId } = get();
    await get().refreshProjectList();

    if (currentProjectId === id) {
      const remaining = get().projects;
      if (remaining.length > 0) {
        await get().loadProjectById(remaining[0].id);
      } else {
        useAppStore.getState().newDocument();
        set({
          currentProjectId: null,
          currentProjectTitle: 'Untitled',
          isDirty: false,
          syncStatus: 'saved',
        });
      }
    }

    useAppStore.getState().addToast('프로젝트를 삭제했습니다.');
  },

  renameCurrent: async (title) => {
    const trimmed = title.trim() || 'Untitled';
    set({ currentProjectTitle: trimmed, isDirty: true });
    await get().saveCurrent();
  },

  exportLocal: () => {
    useAppStore.getState().saveProject();
  },
}));
