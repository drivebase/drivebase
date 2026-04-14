import { parseError } from "@/lib/errors";
import { useAuthStore } from "@/store/auth";
import { toast } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "urql";
import { SignInMutation, SignOutMutation, SignUpMutation } from "./mutations";

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
		navigate({ to: "/" });
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
		navigate({ to: "/" });
	}

	return { submit, fetching, error };
}

export function useSignOut() {
	const navigate = useNavigate();
	const clearAuth = useAuthStore((s) => s.clearAuth);
	const [{ fetching }, signOut] = useMutation(SignOutMutation);

	async function submit() {
		const result = await signOut({});

		if (result.error) {
			toast.danger(parseError(result.error).message);
			return;
		}

		clearAuth();
		navigate({ to: "/auth/login" });
	}

	return { submit, fetching };
}
