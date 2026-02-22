import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "urql";
import {
	CONNECT_PROVIDER_MUTATION,
	CREATE_OAUTH_PROVIDER_CREDENTIAL_MUTATION,
	INITIATE_PROVIDER_OAUTH_MUTATION,
	POLL_PROVIDER_AUTH_MUTATION,
} from "@/features/providers/api/provider";
import {
	AuthType,
	type AvailableProvider,
	type ProviderType,
} from "@/gql/graphql";

interface UseProviderConnectOptions {
	onSuccess: () => void;
}

export function useProviderConnect({ onSuccess }: UseProviderConnectOptions) {
	const [, connectProvider] = useMutation(CONNECT_PROVIDER_MUTATION);
	const [, createOAuthCredential] = useMutation(
		CREATE_OAUTH_PROVIDER_CREDENTIAL_MUTATION,
	);
	const [, initiateOAuth] = useMutation(INITIATE_PROVIDER_OAUTH_MUTATION);
	const [, pollProviderAuth] = useMutation(POLL_PROVIDER_AUTH_MUTATION);

	const [selectedProvider, setSelectedProvider] =
		useState<AvailableProvider | null>(null);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isInitiatingOAuth, setIsInitiatingOAuth] = useState<string | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);

	const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const popupRef = useRef<Window | null>(null);

	// Cleanup polling and popup on unmount
	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
			}
			if (popupRef.current && !popupRef.current.closed) {
				popupRef.current.close();
			}
		};
	}, []);

	const stopPolling = useCallback(() => {
		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current);
			pollIntervalRef.current = null;
		}
		if (popupRef.current && !popupRef.current.closed) {
			popupRef.current.close();
		}
		popupRef.current = null;
	}, []);

	/**
	 * Start polling the server for auth completion.
	 * Opens the auth URL in a popup and polls every 2 seconds.
	 */
	const startPollingAuth = useCallback(
		(providerId: string, authorizationUrl: string) => {
			// Open auth URL in popup
			const popup = window.open(
				authorizationUrl,
				"drivebase_auth",
				"width=600,height=700,menubar=no,toolbar=no,location=yes",
			);
			popupRef.current = popup;

			setIsInitiatingOAuth(providerId);

			pollIntervalRef.current = setInterval(async () => {
				// If popup was closed by user, stop polling
				if (popup && popup.closed) {
					stopPolling();
					setIsInitiatingOAuth(null);
					setError("Authentication window was closed.");
					return;
				}

				try {
					const result = await pollProviderAuth({ id: providerId });

					if (result.error) {
						stopPolling();
						setIsInitiatingOAuth(null);
						setError(`Auth polling failed: ${result.error.message}`);
						return;
					}

					const status = result.data?.pollProviderAuth.status;

					if (status === "success") {
						stopPolling();
						setIsInitiatingOAuth(null);
						onSuccess();
						setSelectedProvider(null);
					}
					// status === "pending" → keep polling
				} catch {
					stopPolling();
					setIsInitiatingOAuth(null);
					setError("An unexpected error occurred during authentication.");
				}
			}, 2000);
		},
		[pollProviderAuth, onSuccess, stopPolling],
	);

	const handleInitiateOAuth = async (id: string, usesPollingAuth?: boolean) => {
		setIsInitiatingOAuth(id);
		setError(null);
		try {
			const oauthResult = await initiateOAuth({ id });
			if (oauthResult.error) {
				setError(`Failed to initiate OAuth: ${oauthResult.error.message}`);
				setIsInitiatingOAuth(null);
			} else if (oauthResult.data?.initiateProviderOAuth) {
				const { authorizationUrl, state } =
					oauthResult.data.initiateProviderOAuth;
				localStorage.setItem(`oauth_state_${id}`, state);

				if (usesPollingAuth) {
					// Poll-based flow: open popup and poll
					startPollingAuth(id, authorizationUrl);
				} else {
					// Standard OAuth: redirect the whole page
					window.location.href = authorizationUrl;
				}
			}
		} catch (err) {
			console.error(err);
			setError("An unexpected error occurred.");
			setIsInitiatingOAuth(null);
		}
	};

	const handleConnect = async (formData: {
		displayName?: string;
		config?: Record<string, unknown>;
		oauthCredentialId?: string;
	}) => {
		if (!selectedProvider) return;
		setIsConnecting(true);
		setError(null);
		try {
			let oauthCredentialId = formData.oauthCredentialId;

			if (selectedProvider.authType === AuthType.Oauth && !oauthCredentialId) {
				if (!formData.config) {
					setError("OAuth credentials are required");
					setIsConnecting(false);
					return;
				}

				const credentialResult = await createOAuthCredential({
					input: {
						type: selectedProvider.id.toUpperCase() as ProviderType,
						config: formData.config,
					},
				});

				if (credentialResult.error) {
					setError(
						`Failed to save OAuth credentials: ${credentialResult.error.message}`,
					);
					setIsConnecting(false);
					return;
				}

				oauthCredentialId =
					credentialResult.data?.createOAuthProviderCredential.id;
			}

			const result = await connectProvider({
				input: {
					name: formData.displayName || selectedProvider.name,
					type: selectedProvider.id.toUpperCase() as ProviderType,
					config: formData.config,
					oauthCredentialId,
				},
			});

			if (result.error) {
				setError(`Failed to connect: ${result.error.message}`);
				setIsConnecting(false);
				return;
			}

			const providerId = result.data?.connectStorage.id;

			if (selectedProvider.authType === AuthType.Oauth && providerId) {
				await handleInitiateOAuth(providerId, selectedProvider.usesPollingAuth);
				return;
			}

			onSuccess();
			setSelectedProvider(null);
		} catch (err) {
			console.error(err);
			setError("An unexpected error occurred.");
		} finally {
			setIsConnecting(false);
		}
	};

	return {
		selectedProvider,
		setSelectedProvider,
		isConnecting,
		isInitiatingOAuth,
		error,
		setError,
		handleConnect,
		handleInitiateOAuth,
	};
}
