import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginPage } from "@/features/auth/LoginPage";
import { useAuthStore } from "@/features/auth/store/authStore";

export const Route = createFileRoute("/login")({
	beforeLoad: () => {
		if (useAuthStore.getState().isAuthenticated) {
			throw redirect({ to: "/" });
		}
	},
	component: LoginPage,
});
