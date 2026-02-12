import { createFileRoute, redirect } from "@tanstack/react-router";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/register")({
	beforeLoad: () => {
		if (useAuthStore.getState().isAuthenticated) {
			throw redirect({ to: "/" });
		}
	},
	component: RegisterPage,
});
