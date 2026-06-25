import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useAuthStore } from '@/store/useAuthStore';
import { useCloudProjectStore } from '@/store/useCloudProjectStore';

export async function performLogout(router: AppRouterInstance, redirectTo = '/') {
  await useAuthStore.getState().logout();
  useCloudProjectStore.setState({
    currentProjectId: null,
    projects: [],
    bootstrapped: false,
    isDirty: false,
    syncStatus: 'idle',
    errorMessage: null,
    pickerOpen: false,
  });
  router.push(redirectTo);
  router.refresh();
}
