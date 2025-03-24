import { createFileRoute, Outlet, useRouter } from '@tanstack/react-router';
import AppLayout from '@drivebase/frontend/components/layouts/app.layout';
import { useGetCurrentWorkspaceQuery } from '@drivebase/react/redux/endpoints/workspaces';
import { Loader } from 'lucide-react';
import { useEffect } from 'react';

export const Route = createFileRoute('/_protected/_dashboard')({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const { isLoading, error } = useGetCurrentWorkspaceQuery();

  useEffect(() => {
    if (error) {
      if ('status' in error && error.status === 401) {
        router.navigate({ to: '/workspaces' });
      }
    }
  }, [error, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!error)
    return (
      <AppLayout>
        <Outlet />
      </AppLayout>
    );
}
