import { useState } from "react";
import { useMutation } from "urql";
import {
	CONNECT_PROVIDER_MUTATION,
	INITIATE_PROVIDER_OAUTH_MUTATION,
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
	const [, initiateOAuth] = useMutation(INITIATE_PROVIDER_OAUTH_MUTATION);

	const [selectedProvider, setSelectedProvider] =
		useState<AvailableProvider | null>(null);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isInitiatingOAuth, setIsInitiatingOAuth] = useState<string | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);

	const handleInitiateOAuth = async (id: string) => {
		setIsInitiatingOAuth(id);
		setError(null);
		try {
			const oauthResult = await initiateOAuth({ id });
			if (oauthResult.error) {
				setError(`Failed to initiate OAuth: ${oauthResult.error.message}`);
			} else if (oauthResult.data?.initiateProviderOAuth) {
				const { authorizationUrl, state } =
					oauthResult.data.initiateProviderOAuth;
				localStorage.setItem(`oauth_state_${id}`, state);
				window.location.href = authorizationUrl;
			}
		} catch (err) {
			console.error(err);
			setError("An unexpected error occurred.");
		} finally {
			setIsInitiatingOAuth(null);
		}
	};

	const handleConnect = async (formData: Record<string, unknown>) => {
		if (!selectedProvider) return;
		setIsConnecting(true);
		setError(null);
		try {
			const { _displayName, ...config } = formData;

			const result = await connectProvider({
				input: {
					name: (_displayName as string) || selectedProvider.name,
					type: selectedProvider.id.toUpperCase() as ProviderType,
					config: config,
				},
			});

			if (result.error) {
				setError(`Failed to connect: ${result.error.message}`);
				setIsConnecting(false);
				return;
			}

			const providerId = result.data?.connectStorage.id;

			if (selectedProvider.authType === AuthType.Oauth && providerId) {
				await handleInitiateOAuth(providerId);
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
