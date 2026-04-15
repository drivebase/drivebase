import { LoadingScreen } from "@/components/LoadingScreen";
import { Sidebar } from "@/components/Sidebar";
import { MeQuery } from "@/features/auth/queries";
import { gqlClient } from "@/lib/gql-client";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
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
		const { workspace } = useWorkspaceStore.getState();
		if (!workspace) {
			throw redirect({ to: "/workspaces" });
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
	return (
		<div className="flex h-screen bg-surface overflow-hidden">
			<Sidebar />
			<main className="flex-1 overflow-auto bg-background m-2 rounded-xl">
				<Outlet />
			</main>
		</div>
	);
}
