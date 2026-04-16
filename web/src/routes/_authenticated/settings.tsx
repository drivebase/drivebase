import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings")({
	beforeLoad: ({ location }) => {
		if (location.pathname === "/settings") {
			throw redirect({ to: "/settings/general" });
		}
	},
	component: () => <Outlet />,
});
