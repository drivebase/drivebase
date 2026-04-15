import { MeQuery } from "@/features/auth/queries";
import { gqlClient } from "@/lib/gql-client";
import { useAuthStore } from "@/store/auth";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspaces")({
	beforeLoad: () => {
		const { token } = useAuthStore.getState();
		if (!token) throw redirect({ to: "/auth/login" });
	},
	loader: async () => {
		const result = await gqlClient.query(MeQuery, {}).toPromise();
		if (result.error || !result.data) {
			useAuthStore.getState().clearAuth();
			throw redirect({ to: "/auth/login" });
		}
		useAuthStore.getState().setUser(result.data.me);
	},
	component: () => <Outlet />,
});
