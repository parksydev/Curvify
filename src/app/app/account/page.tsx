import AuthGuard from '@/components/marketing/AuthGuard';
import AccountSettings from '@/components/auth/AccountSettings';

export const metadata = {
  title: 'Account — Curvify',
};

export default function AccountPage() {
  return (
    <AuthGuard>
      <AccountSettings />
    </AuthGuard>
  );
}
