import { LoadingScreen } from "@/components/LoadingScreen";
import { SettingsSidebar } from "@/components/SettingsSidebar";
import { Sidebar } from "@/components/Sidebar";
import { MeQuery } from "@/features/auth/queries";
import { gqlClient } from "@/lib/gql-client";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";

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
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isSettings = pathname.startsWith("/settings");

	return (
		<div className="flex h-screen bg-surface overflow-hidden">
			<div className="relative w-60 shrink-0 h-screen overflow-hidden">
				<div
					className="absolute inset-0 transition-transform duration-300 ease-in-out"
					style={{ transform: isSettings ? "translateX(-100%)" : "translateX(0)" }}
				>
					<Sidebar />
				</div>
				<div
					className="absolute inset-0 transition-transform duration-300 ease-in-out"
					style={{ transform: isSettings ? "translateX(0)" : "translateX(100%)" }}
				>
					<SettingsSidebar />
				</div>
			</div>
			<main className="flex-1 overflow-auto bg-background m-2 rounded-xl">
				<Outlet />
			</main>
		</div>
	);
}
