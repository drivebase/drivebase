import { useCallback, useState } from "react";
import { API_BASE_URL } from "@/shared/lib/apiUrl";

interface TelegramAuthState {
	loading: boolean;
	requires2FA: boolean;
	sessionString: string | null;
	error: string | null;
}

function getHeaders() {
	const token = localStorage.getItem("token");
	return {
		"Content-Type": "application/json",
		Authorization: token ? `Bearer ${token}` : "",
	};
}

export function useTelegramAuth(providerId: string) {
	const [state, setState] = useState<TelegramAuthState>({
		loading: false,
		requires2FA: false,
		sessionString: null,
		error: null,
	});

	const sendCode = useCallback(
		async (apiId: number, apiHash: string, phone: string) => {
			setState((prev) => ({ ...prev, loading: true, error: null }));
			try {
				const res = await fetch(`${API_BASE_URL}/api/telegram/send-code`, {
					method: "POST",
					headers: getHeaders(),
					body: JSON.stringify({ providerId, apiId, apiHash, phone }),
				});

				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Failed to send code");
				}

				setState((prev) => ({ ...prev, loading: false }));
				return true;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Failed to send code";
				setState((prev) => ({ ...prev, loading: false, error: message }));
				return false;
			}
		},
		[providerId],
	);

	const verifyCode = useCallback(
		async (code: string) => {
			setState((prev) => ({ ...prev, loading: true, error: null }));
			try {
				const res = await fetch(`${API_BASE_URL}/api/telegram/verify`, {
					method: "POST",
					headers: getHeaders(),
					body: JSON.stringify({ providerId, code }),
				});

				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Failed to verify code");
				}

				if (data.requires2FA) {
					setState((prev) => ({
						...prev,
						loading: false,
						requires2FA: true,
					}));
					return { requires2FA: true as const };
				}

				setState((prev) => ({
					...prev,
					loading: false,
					sessionString: data.sessionString,
				}));
				return { sessionString: data.sessionString as string };
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Verification failed";
				setState((prev) => ({ ...prev, loading: false, error: message }));
				return null;
			}
		},
		[providerId],
	);

	const verify2FA = useCallback(
		async (password: string) => {
			setState((prev) => ({ ...prev, loading: true, error: null }));
			try {
				const res = await fetch(`${API_BASE_URL}/api/telegram/verify-2fa`, {
					method: "POST",
					headers: getHeaders(),
					body: JSON.stringify({ providerId, password }),
				});

				const data = await res.json();
				if (!res.ok) {
					throw new Error(data.error || "Failed to verify 2FA");
				}

				setState((prev) => ({
					...prev,
					loading: false,
					sessionString: data.sessionString,
				}));
				return data.sessionString as string;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "2FA verification failed";
				setState((prev) => ({ ...prev, loading: false, error: message }));
				return null;
			}
		},
		[providerId],
	);

	const completeAuth = useCallback(
		async (sessionString: string, oauthState: string) => {
			const callbackUrl = `${API_BASE_URL}/webhook/callback?code=${encodeURIComponent(sessionString)}&state=${encodeURIComponent(oauthState)}`;

			try {
				const res = await fetch(callbackUrl, { redirect: "manual" });
				return res.status === 302 || res.ok;
			} catch {
				// fetch with redirect: "manual" may throw on redirect — that's OK
				return true;
			}
		},
		[],
	);

	return {
		...state,
		sendCode,
		verifyCode,
		verify2FA,
		completeAuth,
	};
}
