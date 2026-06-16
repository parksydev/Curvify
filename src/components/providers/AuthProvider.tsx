'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import { useCloudProjectStore } from '@/store/useCloudProjectStore';

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);

  useEffect(() => {
    void initialize();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await initialize();
      }
      if (event === 'SIGNED_OUT') {
        useAuthStore.setState({
          user: null,
          sessionUser: null,
          profile: null,
          initialized: true,
        });
        useCloudProjectStore.setState({
          currentProjectId: null,
          projects: [],
          bootstrapped: false,
          isDirty: false,
        });
      }
      if (event === 'USER_UPDATED' && session?.user) {
        await refreshProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, [initialize, refreshProfile]);

  return <>{children}</>;
}
