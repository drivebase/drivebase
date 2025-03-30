import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';

type RouterContext = {
  version: string;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});
