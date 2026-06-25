'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { performLogout } from '@/lib/auth/logout';
import { useAuthStore } from '@/store/useAuthStore';

const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/tech', label: 'Technology' },
  { href: '/pricing', label: 'Pricing' },
];

export default function MarketingNav() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  return (
    <header className="mkt-nav">
      <div className="mkt-nav-inner">
        <Link href="/" className="mkt-logo">
          <span className="mkt-logo-mark" aria-hidden>
            ∿
          </span>
          Curvify
        </Link>

        <nav className="mkt-nav-links" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? 'active' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mkt-nav-actions">
          {!initialized ? (
            <span className="mkt-nav-skeleton" aria-hidden />
          ) : user ? (
            <>
              <Link href="/app" className="mkt-btn mkt-btn-primary mkt-btn-sm">
                Workspace
              </Link>
              <Link href="/app/account" className="mkt-nav-user" title={user.email}>
                {user.name}
              </Link>
              <button
                type="button"
                className="mkt-btn mkt-btn-ghost mkt-btn-sm"
                onClick={() => void performLogout(router, '/')}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="mkt-btn mkt-btn-ghost mkt-btn-sm">
                Log in
              </Link>
              <Link href="/signup" className="mkt-btn mkt-btn-primary mkt-btn-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
