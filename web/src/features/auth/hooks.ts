import { parseError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";
import { toast } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "urql";
import {
	RequestPasswordResetMutation,
	ResetPasswordMutation,
	SignInMutation,
	SignOutMutation,
	SignUpMutation,
} from "./mutations";

export function useSignIn() {
	const navigate = useNavigate();
	const setAuth = useAuthStore((s) => s.setAuth);
	const [{ fetching }, signIn] = useMutation(SignInMutation);
	const [error, setError] = useState<string | null>(null);

	async function submit(email: string, password: string) {
		setError(null);
		const result = await signIn({ input: { email, password } });

		if (result.error || !result.data) {
			setError(parseError(result.error).message);
			return;
		}

		const { accessToken, refreshToken, user } = result.data.signIn;
		setAuth(accessToken, refreshToken, user);
		toast.success(`Welcome back, ${user.name}`);
		navigate({ to: "/workspaces" });
	}

	return { submit, fetching, error };
}

export function useSignUp() {
	const navigate = useNavigate();
	const setAuth = useAuthStore((s) => s.setAuth);
	const [{ fetching }, signUp] = useMutation(SignUpMutation);
	const [error, setError] = useState<string | null>(null);

	async function submit(name: string, email: string, password: string) {
		setError(null);
		const result = await signUp({ input: { name, email, password } });

		if (result.error || !result.data) {
			setError(parseError(result.error).message);
			return;
		}

		const { accessToken, refreshToken, user } = result.data.signUp;
		setAuth(accessToken, refreshToken, user);
		toast.success(`Welcome, ${user.name}`);
		navigate({ to: "/workspaces" });
	}

	return { submit, fetching, error };
}

export function usePasswordReset() {
	const navigate = useNavigate();
	const [{ fetching: requesting }, requestReset] = useMutation(RequestPasswordResetMutation);
	const [{ fetching: resetting }, resetPassword] = useMutation(ResetPasswordMutation);
	const [error, setError] = useState<string | null>(null);
	const [step, setStep] = useState<"email" | "otp">("email");
	const [email, setEmail] = useState("");

	async function requestOtp(emailValue: string) {
		setError(null);
		const result = await requestReset({ email: emailValue });

		if (result.error || !result.data) {
			setError(parseError(result.error).message);
			return;
		}

		setEmail(emailValue);
		setStep("otp");
	}

	async function submitReset(otp: string, newPassword: string) {
		setError(null);
		const result = await resetPassword({ email, otp, newPassword });

		if (result.error || !result.data) {
			setError(parseError(result.error).message);
			return;
		}

		toast.success("Password reset successfully");
		navigate({ to: "/auth/login" });
	}

	return {
		step,
		email,
		error,
		requesting,
		resetting,
		requestOtp,
		submitReset,
	};
}

export function useSignOut() {
	const navigate = useNavigate();
	const clearAuth = useAuthStore((s) => s.clearAuth);
	const clearWorkspace = useWorkspaceStore((s) => s.clearWorkspace);
	const [{ fetching }, signOut] = useMutation(SignOutMutation);

	async function submit() {
		const result = await signOut({});

		if (result.error) {
			toast.danger(parseError(result.error).message);
			return;
		}

		clearAuth();
		clearWorkspace();
		navigate({ to: "/auth/login" });
	}

	return { submit, fetching };
}
