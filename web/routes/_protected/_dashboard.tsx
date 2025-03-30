import { ApolloError, useQuery } from '@apollo/client';
import { Outlet, createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { Loader } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';

import AppLayout from '@drivebase/web/components/layouts/app.layout';
import { GET_CURRENT_WORKSPACE } from '@drivebase/web/gql/queries/workspaces';

export const Route = createFileRoute('/_protected/_dashboard')({
  component: RouteComponent,
  loader: () => {
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
      redirect({ to: '/auth/login', throw: true });
    }

    const workspaceId = localStorage.getItem('workspaceId');
    if (!workspaceId) {
      redirect({ to: '/workspaces', throw: true });
    }
  },
});

function RouteComponent() {
  const router = useRouter();
  const { loading, error } = useQuery(GET_CURRENT_WORKSPACE);

  useEffect(() => {
    if (error instanceof ApolloError) {
      if (error.message === 'Workspace not found') {
        void router.navigate({ to: '/workspaces' });
        return;
      }

      toast.error(error.message);
    }
  }, [error, router]);

  if (loading) {
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
