'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AuthLoadingScreen from '@/components/auth/AuthLoadingScreen';
import { useAuthStore } from '@/store/useAuthStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  const loginUrl = `/login?redirect=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    if (initialized && !user) {
      router.replace(loginUrl);
    }
  }, [initialized, user, router, loginUrl]);

  if (!initialized) {
    return (
      <AuthLoadingScreen
        message="워크스페이스 준비 중…"
        submessage="세션을 확인하고 있습니다."
      />
    );
  }

  if (!user) {
    return (
      <AuthLoadingScreen
        message="로그인이 필요합니다"
        submessage="로그인 페이지로 이동합니다…"
      />
    );
  }

  return <>{children}</>;
}
