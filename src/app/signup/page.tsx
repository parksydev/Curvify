import { Suspense } from 'react';
import AuthLoadingScreen from '@/components/auth/AuthLoadingScreen';
import AuthFlow from '@/components/marketing/AuthFlow';
import AuthPageShell from '@/components/marketing/AuthPageShell';
import '../marketing.css';

export const metadata = {
  title: 'Sign up — Curvify',
  description: 'Create your free Curvify account',
};

export default function SignupPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={<AuthLoadingScreen message="잠시만요…" compact />}>
        <AuthFlow mode="signup" />
      </Suspense>
    </AuthPageShell>
  );
}
