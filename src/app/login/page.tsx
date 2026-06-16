import { Suspense } from 'react';
import AuthForm from '@/components/marketing/AuthForm';
import Link from 'next/link';
import '../marketing.css';

export const metadata = {
  title: 'Log in — Curvify',
  description: 'Log in to your Curvify workspace',
};

export default function LoginPage() {
  return (
    <div className="mkt-auth-page">
      <div className="mkt-auth-panel">
        <Suspense fallback={<div className="auth-card">Loading…</div>}>
          <AuthForm mode="login" />
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
          <h2>Your graphs are waiting.</h2>
          <p>
            Pick up where you left off — projects, fitted curves, and analysis overlays sync to
            your browser session.
          </p>
          <blockquote className="mkt-auth-quote">
            &ldquo;I sketched a damped oscillation in lecture and had the equation before the
            professor finished the board.&rdquo;
            <cite>— PhD candidate, MIT (probably)</cite>
          </blockquote>
        </div>
      </aside>
    </div>
  );
}
