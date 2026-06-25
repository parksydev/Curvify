import MarketingNav from '@/components/marketing/MarketingNav';
import type { ReactNode } from 'react';

export default function AuthPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="mkt-page auth-flow-page">
      <MarketingNav />
      <main className="auth-flow-main">{children}</main>
    </div>
  );
}
