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
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Defer auth API calls — awaiting them inside this callback can deadlock getUser().
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setTimeout(() => void initialize(), 0);
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
        setTimeout(() => void refreshProfile(), 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [initialize, refreshProfile]);

  return <>{children}</>;
}
