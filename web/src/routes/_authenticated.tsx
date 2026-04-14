import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/store/auth";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ location }) => {
		const { token } = useAuthStore.getState();
		if (!token) {
			throw redirect({
				to: "/auth/login",
				search: { redirect: location.href },
			});
		}
	},
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	return <Outlet />;
}
