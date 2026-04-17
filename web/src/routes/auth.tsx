import { useAuthStore } from "@/store/auth";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
	beforeLoad: () => {
		const { token } = useAuthStore.getState();
		if (token) {
			throw redirect({ to: "/" });
		}
	},
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-950 via-slate-900 to-indigo-950">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
				<div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
			</div>
			<Outlet />
		</div>
	);
}
