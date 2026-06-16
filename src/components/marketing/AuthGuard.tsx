'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectWorkspace } from '@/components/app/ProjectWorkspace';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  useEffect(() => {
    if (initialized && !user) {
      router.replace('/login?redirect=/app');
    }
  }, [initialized, user, router]);

  if (!initialized) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-inner">
          <div className="auth-spinner" />
          <span>Loading workspace…</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
