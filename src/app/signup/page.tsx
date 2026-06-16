import { Suspense } from 'react';
import AuthForm from '@/components/marketing/AuthForm';
import Link from 'next/link';
import '../marketing.css';

export const metadata = {
  title: 'Sign up — Curvify',
  description: 'Create your free Curvify account',
};

export default function SignupPage() {
  return (
    <div className="mkt-auth-page">
      <div className="mkt-auth-panel">
        <Suspense fallback={<div className="auth-card">Loading…</div>}>
          <AuthForm mode="signup" />
        </Suspense>
        <p style={{ marginTop: 24, textAlign: 'center' }}>
          <Link href="/" style={{ fontSize: 14, color: '#64748b' }}>
            ← Back to home
          </Link>
        </p>
      </div>

      <aside className="mkt-auth-side">
        <div className="mkt-auth-side-bg" aria-hidden />
        <div className="mkt-auth-side-content">
          <h2>Start free. Upgrade when you&apos;re hooked.</h2>
          <p>
            Every account gets full access to sketch-to-equation fitting. No credit card. No
            catch — just math.
          </p>
          <blockquote className="mkt-auth-quote">
            &ldquo;We built Curvify because GeoGebra is great, but sometimes you just want to draw
            and get f(x).&rdquo;
            <cite>— The Curvify team</cite>
          </blockquote>
        </div>
      </aside>
    </div>
  );
}
