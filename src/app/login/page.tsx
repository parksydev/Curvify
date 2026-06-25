import { Suspense } from 'react';
import AuthLoadingScreen from '@/components/auth/AuthLoadingScreen';
import AuthFlow from '@/components/marketing/AuthFlow';
import AuthPageShell from '@/components/marketing/AuthPageShell';
import '../marketing.css';

export const metadata = {
  title: 'Log in — Curvify',
  description: 'Log in to your Curvify workspace',
};

export default function LoginPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={<AuthLoadingScreen message="잠시만요…" compact />}>
        <AuthFlow mode="login" />
      </Suspense>
    </AuthPageShell>
  );
}
