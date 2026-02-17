import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuthStore } from "@/features/auth/store/authStore";

export const Route = createFileRoute("/_workspace")({
	beforeLoad: ({ location }) => {
		const isAuthenticated = useAuthStore.getState().isAuthenticated;
		if (!isAuthenticated) {
			throw redirect({
				to: "/login",
				search: {
					redirect: location.href,
				},
			});
		}
	},
	component: WorkspaceLayout,
});

function WorkspaceLayout() {
	return (
		<div
			className="min-h-screen w-full flex items-center justify-center p-4"
			style={{
				background:
					"radial-gradient(ellipse 80% 50% at 50% -10%, hsl(var(--primary) / 0.07), transparent)",
			}}
		>
			<Outlet />
		</div>
	);
}
