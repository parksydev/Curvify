'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { buildAuthQuery, getSafeRedirect } from '@/lib/auth/redirect';
import type { UserPlan } from '@/lib/supabase/database.types';
import { useAuthStore } from '@/store/useAuthStore';
import AuthLoadingScreen from '@/components/auth/AuthLoadingScreen';

type AuthMode = 'login' | 'signup';
type LoginStep = 'email' | 'password';
type SignupStep = 'name' | 'email' | 'password';
type Step = LoginStep | SignupStep;

interface AuthFlowProps {
  mode: AuthMode;
}

function parsePlan(value: string | null): UserPlan | undefined {
  if (value === 'pro' || value === 'team') return value;
  return undefined;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

const LOGIN_STEPS: LoginStep[] = ['email', 'password'];
const SIGNUP_STEPS: SignupStep[] = ['name', 'email', 'password'];

const STEP_COPY: Record<Step, { title: string; subtitle?: string }> = {
  name: { title: '이름을\n입력해 주세요' },
  email: { title: '이메일을\n입력해 주세요' },
  password: { title: '비밀번호를\n입력해 주세요' },
};

export default function AuthFlow({ mode }: AuthFlowProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = getSafeRedirect(searchParams.get('redirect'));
  const plan = parsePlan(searchParams.get('plan'));
  const authError = searchParams.get('error');

  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  const isSignup = mode === 'signup';
  const steps = isSignup ? SIGNUP_STEPS : LOGIN_STEPS;

  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(
    authError ? decodeURIComponent(authError.replace(/\+/g, ' ')) : '',
  );
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const step = steps[stepIndex] as Step;

  const authQuery = useMemo(
    () => buildAuthQuery({ redirect, plan }),
    [redirect, plan],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, [stepIndex, emailSent]);

  useEffect(() => {
    if (initialized && user && !loading) {
      setRedirecting(true);
      router.replace(redirect);
    }
  }, [initialized, user, loading, router, redirect]);

  function goBack() {
    setError('');
    if (stepIndex === 0) {
      router.push('/');
      return;
    }
    setStepIndex((i) => i - 1);
  }

  function validateCurrentStep(): string | null {
    if (step === 'name') {
      if (!name.trim()) return '이름을 입력해 주세요.';
      return null;
    }
    if (step === 'email') {
      if (!email.trim()) return '이메일을 입력해 주세요.';
      if (!isValidEmail(email)) return '올바른 이메일 형식이 아니에요.';
      return null;
    }
    if (!password) return '비밀번호를 입력해 주세요.';
    if (isSignup && password.length < 6) return '비밀번호는 6자 이상이에요.';
    return null;
  }

  function goNext() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
      return;
    }

    void submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      goNext();
    }
  }

  async function submit() {
    setLoading(true);
    setError('');

    const result = isSignup
      ? await signup(name, email, password, plan)
      : await login(email, password);

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      if (!isSignup) setStepIndex(1);
      return;
    }

    if (result.needsEmailConfirmation) {
      setEmailSent(true);
      return;
    }

    setRedirecting(true);
    router.replace(redirect);
    router.refresh();
  }

  if (!initialized) {
    return <AuthLoadingScreen message="잠시만요…" compact />;
  }

  if (redirecting || (initialized && user)) {
    return <AuthLoadingScreen message="워크스페이스 여는 중…" workspace />;
  }

  if (emailSent) {
    return (
      <div className="auth-flow-card">
        <div className="auth-flow-body auth-flow-body--center">
          <span className="auth-flow-step-label">가입 완료</span>
          <h1 className="auth-flow-title">{'메일함을\n확인해 주세요'}</h1>
          <p className="auth-flow-email-preview">{email}</p>
        </div>
        <footer className="auth-flow-footer">
          <Link href={`/login${authQuery}`} className="mkt-btn mkt-btn-primary mkt-btn-full mkt-btn-lg">
            로그인하기
          </Link>
        </footer>
      </div>
    );
  }

  const isLastStep = stepIndex === steps.length - 1;
  const copy = STEP_COPY[step];

  return (
    <div className="auth-flow-card">
      <header className="auth-flow-header">
        <button type="button" className="auth-flow-back" onClick={goBack} aria-label="이전">
          ←
        </button>
        <div className="auth-flow-progress" aria-hidden>
          {steps.map((_, i) => (
            <span key={i} className={i <= stepIndex ? 'active' : ''} />
          ))}
        </div>
      </header>

      <div className="auth-flow-body" key={step}>
        <span className="auth-flow-step-label">
          {isSignup ? '회원가입' : '로그인'} · {stepIndex + 1}/{steps.length}
        </span>
        <h1 className="auth-flow-title">{copy.title}</h1>

        {step === 'name' && (
          <input
            ref={inputRef}
            className="auth-flow-input"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
          />
        )}

        {step === 'email' && (
          <input
            ref={inputRef}
            className="auth-flow-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            onKeyDown={handleKeyDown}
          />
        )}

        {step === 'password' && (
          <div className="auth-flow-password">
            <input
              ref={inputRef}
              className="auth-flow-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="auth-flow-password-toggle"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? '숨기기' : '보기'}
            </button>
          </div>
        )}

        {error && (
          <p className="auth-flow-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <footer className="auth-flow-footer">
        <button
          type="button"
          className="mkt-btn mkt-btn-primary mkt-btn-full mkt-btn-lg"
          onClick={goNext}
          disabled={loading}
        >
          {loading ? '처리 중…' : isLastStep ? (isSignup ? '가입하기' : '로그인') : '다음'}
        </button>

        {stepIndex === 0 && (
          <p className="auth-flow-switch">
            {isSignup ? (
              <>
                이미 계정이 있나요?{' '}
                <Link href={`/login${authQuery}`}>로그인</Link>
              </>
            ) : (
              <>
                처음이신가요?{' '}
                <Link href={`/signup${authQuery}`}>가입하기</Link>
              </>
            )}
          </p>
        )}
      </footer>
    </div>
  );
}
