import AuthGuard from '@/components/marketing/AuthGuard';
import { ProjectWorkspace } from '@/components/app/ProjectWorkspace';

export default function AppPage() {
  return (
    <AuthGuard>
      <ProjectWorkspace />
    </AuthGuard>
  );
}
