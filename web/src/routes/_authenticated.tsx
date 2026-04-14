import { LoadingScreen } from "@/components/LoadingScreen";
import { MeQuery } from "@/features/auth/mutations";
import { gqlClient } from "@/lib/gql-client";
import { useAuthStore } from "@/store/auth";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

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
	loader: async () => {
		const result = await gqlClient.query(MeQuery, {}).toPromise();

		if (result.error || !result.data) {
			useAuthStore.getState().clearAuth();
			throw redirect({ to: "/auth/login" });
		}

		useAuthStore.getState().setUser(result.data.me);
	},
	pendingComponent: LoadingScreen,
	pendingMs: 0,
	pendingMinMs: 300,
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	return <Outlet />;
}
