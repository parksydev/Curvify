'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { performLogout } from '@/lib/auth/logout';
import type { UserPlan } from '@/lib/supabase/database.types';
import { useAuthStore } from '@/store/useAuthStore';

const PLAN_LABELS: Record<UserPlan, string> = {
  free: 'Starter',
  pro: 'Pro',
  team: 'Team',
};

export default function AccountSettings() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  if (!user) return null;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const result = await updateProfile({ fullName: name });
    setSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setMessage('프로필을 저장했습니다.');
  }

  return (
    <div className="account-page">
      <header className="account-header">
        <Link href="/app" className="account-back">← Workspace</Link>
        <h1>Account</h1>
        <p>계정 정보와 플랜을 관리합니다.</p>
      </header>

      <section className="account-card">
        <h2>Profile</h2>
        <form className="account-form" onSubmit={(e) => void handleSave(e)}>
          <label className="account-field">
            <span>이름</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label className="account-field">
            <span>이메일</span>
            <input type="email" value={user.email} disabled />
          </label>
          {error && (
            <p className="account-error" role="alert">{error}</p>
          )}
          {message && (
            <p className="account-success" role="status">{message}</p>
          )}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? '저장 중…' : '변경 사항 저장'}
          </button>
        </form>
      </section>

      <section className="account-card">
        <h2>Plan</h2>
        <div className="account-plan-row">
          <span className={`account-plan-badge plan-${user.plan}`}>
            {PLAN_LABELS[user.plan]}
          </span>
          {user.plan === 'free' && (
            <Link href="/pricing" className="account-plan-link">
              Pro로 업그레이드 →
            </Link>
          )}
        </div>
        <p className="account-plan-note">
          {user.plan === 'free'
            ? 'Starter 플랜으로 스케치·근사 기능을 무료로 사용할 수 있습니다.'
            : `${PLAN_LABELS[user.plan]} 플랜이 활성화되어 있습니다.`}
        </p>
      </section>

      <section className="account-card account-actions">
        <button
          type="button"
          className="btn-input-cancel"
          onClick={() => void performLogout(router, '/')}
        >
          Log out
        </button>
      </section>
    </div>
  );
}
