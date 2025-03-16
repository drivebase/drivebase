import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import AppLayout from '@drivebase/frontend/components/layouts/app.layout';

export const Route = createFileRoute('/_protected/_dashboard')({
  beforeLoad() {
    const workspaceId = document.cookie
      .split('; ')
      .find((row) => row.startsWith('workspaceId='))
      ?.split('=')[1];

    if (!workspaceId) {
      return redirect({ to: '/workspaces' });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
