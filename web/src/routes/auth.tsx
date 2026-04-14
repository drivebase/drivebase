import { AuthPanel } from "@/features/auth/components/AuthPanel";
import { useAuthStore } from "@/store/auth";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
	beforeLoad: () => {
		const { token } = useAuthStore.getState();
		if (token) throw redirect({ to: "/" });
	},
	component: AuthLayout,
});

function AuthLayout() {
	return (
		<div className="min-h-screen grid lg:grid-cols-2">
			<AuthPanel />
			<div className="flex items-center justify-center p-8 bg-background">
				<Outlet />
			</div>
		</div>
	);
}
