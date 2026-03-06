import { createFileRoute, redirect } from "@tanstack/react-router";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { useAuthStore } from "@/features/auth/store/authStore";

export const Route = createFileRoute("/forgot-password")({
	beforeLoad: () => {
		if (useAuthStore.getState().isAuthenticated) {
			throw redirect({ to: "/" });
		}
	},
	component: ForgotPasswordPage,
});
