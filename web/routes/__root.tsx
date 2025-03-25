import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

type RouterContext = {
  version: string;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});
