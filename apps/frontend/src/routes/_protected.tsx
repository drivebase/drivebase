import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_protected')({
  component: () => <Outlet />,
  beforeLoad(ctx) {
    if (!ctx.context.auth.isAuthenticated) {
      return redirect({ to: '/auth/login' });
    }
  },
});
