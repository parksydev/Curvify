'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

type AuthMode = 'login' | 'signup';

interface AuthFormProps {
  mode: AuthMode;
}

export default function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/app';
  const authError = searchParams.get('error');

  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(authError ? decodeURIComponent(authError.replace(/\+/g, ' ')) : '');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const isSignup = mode === 'signup';

  useEffect(() => {
    if (initialized && user) {
      router.replace(redirect);
    }
  }, [initialized, user, router, redirect]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEmailSent(false);
    setLoading(true);

    const result = isSignup ? await signup(name, email, password) : await login(email, password);

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (result.needsEmailConfirmation) {
      setEmailSent(true);
      return;
    }

    router.push(redirect);
    router.refresh();
  }

  if (emailSent) {
    return (
      <div className="auth-card">
        <div className="auth-card-header">
          <Link href="/" className="mkt-logo mkt-logo-lg">
            <span className="mkt-logo-mark" aria-hidden>∿</span>
            Curvify
          </Link>
          <h1>Check your email</h1>
          <p>
            We sent a confirmation link to <strong>{email}</strong>. Click the link to activate
            your account, then log in.
          </p>
        </div>
        <Link href="/login" className="mkt-btn mkt-btn-primary mkt-btn-full">
          Go to log in
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div className="auth-card-header">
        <Link href="/" className="mkt-logo mkt-logo-lg">
          <span className="mkt-logo-mark" aria-hidden>∿</span>
          Curvify
        </Link>
        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        <p>
          {isSignup
            ? 'Start turning sketches into equations in seconds.'
            : 'Log in to continue to your workspace.'}
        </p>
      </div>

      <form className="auth-form" onSubmit={(e) => void handleSubmit(e)}>
        {isSignup && (
          <label className="auth-field">
            <span>Full name</span>
            <input
              type="text"
              autoComplete="name"
              placeholder="Alex Chen"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}

        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder={isSignup ? 'Min. 6 characters' : '••••••••'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="mkt-btn mkt-btn-primary mkt-btn-full" disabled={loading}>
          {loading ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
        </button>
      </form>

      <p className="auth-switch">
        {isSignup ? (
          <>
            Already have an account? <Link href="/login">Log in</Link>
          </>
        ) : (
          <>
            New to Curvify? <Link href="/signup">Sign up for free</Link>
          </>
        )}
      </p>
    </div>
  );
}
