import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useCallback, useEffect, useRef, useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { PiSpinnerGap as Loader2 } from "react-icons/pi";
import { toast } from "sonner";
import { useMutation, useQuery } from "urql";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { graphql } from "@/gql";
import { OAuthInitiator, type ProviderType } from "@/gql/graphql";

const AVAILABLE_PROVIDERS_QUERY = graphql(`
	query GetAvailableProviders {
		availableProviders {
			id
			name
			description
			authType
			usesPollingAuth
			configFields {
				name
				label
				type
				required
				description
				placeholder
			}
		}
	}
`);

const POLL_PROVIDER_AUTH_MUTATION = graphql(`
	mutation PollProviderAuthOnboarding($id: ID!) {
		pollProviderAuth(id: $id) {
			status
			provider {
				id
				name
				type
				isActive
			}
		}
	}
`);

const CONNECT_STORAGE_MUTATION = graphql(`
	mutation ConnectStorage($input: ConnectStorageInput!) {
		connectStorage(input: $input) {
			id
			name
			isActive
		}
	}
`);

const INITIATE_OAUTH_MUTATION = graphql(`
	mutation InitiateProviderOAuth($id: ID!, $source: OAuthInitiator) {
		initiateProviderOAuth(id: $id, source: $source) {
			authorizationUrl
			state
		}
	}
`);

const CONNECTED_PROVIDERS_QUERY = graphql(`
	query GetOnboardingConnectedProviders {
		storageProviders {
			id
			name
			type
			isActive
		}
	}
`);

interface ProviderStepProps {
	onNext: () => void;
	oauth?: string;
	providerId?: string;
	error?: string;
}

function toProviderType(providerId: string): ProviderType {
	return providerId.toUpperCase() as ProviderType;
}

export function ProviderStep({
	onNext,
	oauth,
	providerId,
	error,
}: ProviderStepProps) {
	const [selectedProviderId, setSelectedProviderId] = useState<string>("");
	const [isPolling, setIsPolling] = useState(false);
	const [{ data, fetching }] = useQuery({ query: AVAILABLE_PROVIDERS_QUERY });
	const hasOAuthCallbackResult = oauth === "success" || oauth === "failed";
	const [{ data: connectedData, fetching: fetchingConnected }] = useQuery({
		query: CONNECTED_PROVIDERS_QUERY,
		requestPolicy: hasOAuthCallbackResult ? "network-only" : "cache-first",
	});
	const [{ fetching: connecting }, connectStorage] = useMutation(
		CONNECT_STORAGE_MUTATION,
	);
	const [{ fetching: initializingOAuth }, initiateOAuth] = useMutation(
		INITIATE_OAUTH_MUTATION,
	);
	const [, pollProviderAuth] = useMutation(POLL_PROVIDER_AUTH_MUTATION);

	const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const popupRef = useRef<Window | null>(null);

	const stopPolling = useCallback(() => {
		if (pollIntervalRef.current) {
			clearInterval(pollIntervalRef.current);
			pollIntervalRef.current = null;
		}
		if (popupRef.current && !popupRef.current.closed) {
			popupRef.current.close();
		}
		popupRef.current = null;
		setIsPolling(false);
	}, []);

	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
			if (popupRef.current && !popupRef.current.closed)
				popupRef.current.close();
		};
	}, []);

	const {
		register,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm();

	const selectedProvider = data?.availableProviders.find(
		(p) => p.id === selectedProviderId,
	);

	const connectedProvider = providerId
		? connectedData?.storageProviders.find(
				(provider) => provider.id === providerId,
			)
		: undefined;
	const oauthErrorMessage =
		error === "oauth_failed"
			? t`Authorization failed. Please try connecting your provider again.`
			: t`Authorization failed. Please try again.`;

	const startPollingAuth = useCallback(
		(pollingProviderId: string, authorizationUrl: string) => {
			const popup = window.open(
				authorizationUrl,
				"drivebase_auth",
				"width=600,height=700,menubar=no,toolbar=no,location=yes",
			);
			popupRef.current = popup;
			setIsPolling(true);

			pollIntervalRef.current = setInterval(async () => {
				if (popup?.closed) {
					stopPolling();
					toast.error(<Trans>Authentication window was closed.</Trans>);
					return;
				}

				try {
					const result = await pollProviderAuth({ id: pollingProviderId });
					if (result.data?.pollProviderAuth.status === "success") {
						stopPolling();
						toast.success(<Trans>Storage connected successfully!</Trans>);
						onNext();
					}
				} catch {
					stopPolling();
					toast.error(<Trans>Authentication failed.</Trans>);
				}
			}, 2000);
		},
		[pollProviderAuth, onNext, stopPolling],
	);

	const onSubmit = async (formData: FieldValues) => {
		if (!selectedProvider) return;

		const { _displayName, ...config } = formData;

		try {
			const providerType = toProviderType(selectedProvider.id);

			const result = await connectStorage({
				input: {
					name: _displayName,
					type: providerType,
					config: config,
				},
			});

			if (result.error) {
				toast.error(result.error.message);
				return;
			}

			const provider = result.data?.connectStorage;

			if (selectedProvider.authType === "OAUTH" && provider) {
				// Initiate OAuth flow
				const oauthResult = await initiateOAuth({
					id: provider.id,
					source: OAuthInitiator.Onboarding,
				});
				const authUrl =
					oauthResult.data?.initiateProviderOAuth.authorizationUrl;

				if (authUrl) {
					if (selectedProvider.usesPollingAuth) {
						// Poll-based flow: open popup and poll
						startPollingAuth(provider.id, authUrl);
					} else {
						// Standard OAuth: redirect the whole page
						localStorage.setItem("onboarding_step", "2");
						window.location.href = authUrl;
					}
				}
			} else {
				toast.success(<Trans>Storage connected successfully!</Trans>);
				onNext();
			}
		} catch (_error) {
			toast.error(<Trans>Failed to connect storage provider</Trans>);
		}
	};

	if (fetching) {
		return (
			<div className="flex flex-col items-center justify-center py-12 gap-3">
				<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
				<p className="text-sm text-muted-foreground">
					<Trans>Loading providers...</Trans>
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col flex-1">
			<div className="space-y-6 flex-1">
				<div className="space-y-1.5">
					<h2 className="text-2xl font-bold tracking-tight">
						<Trans>Connect Storage</Trans>
					</h2>
					<p className="text-muted-foreground text-sm leading-relaxed">
						<Trans>
							Select a provider to connect your first storage drive.
						</Trans>
					</p>
				</div>

				{oauth === "success" && (
					<div className=" border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
						{fetchingConnected ? (
							<div className="flex items-center gap-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>
									<Trans>Verifying connected provider...</Trans>
								</span>
							</div>
						) : connectedProvider ? (
							<span>
								<Trans>Connected successfully:</Trans>{" "}
								<strong>{connectedProvider.name}</strong>
							</span>
						) : (
							<span>
								<Trans>
									Authorization completed. Provider sync is still refreshing.
								</Trans>
							</span>
						)}
					</div>
				)}

				{oauth === "failed" && (
					<div className=" border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{oauthErrorMessage}
					</div>
				)}

				<div className="space-y-5">
					<div className="space-y-2">
						<Label>
							<Trans>Storage Provider</Trans>
						</Label>
						<Select
							value={selectedProviderId}
							onValueChange={(val) => {
								setSelectedProviderId(val);
								reset();
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder={t`Select a provider...`} />
							</SelectTrigger>
							<SelectContent>
								{data?.availableProviders.map((provider) => (
									<SelectItem key={provider.id} value={provider.id}>
										{provider.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{selectedProvider && (
							<p className="text-xs text-muted-foreground">
								{selectedProvider.description}
							</p>
						)}
					</div>

					{selectedProvider && (
						<form
							onSubmit={handleSubmit(onSubmit)}
							className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
						>
							<div className="space-y-2">
								<Label htmlFor="_displayName">
									<Trans>Display Name</Trans>
								</Label>
								<Input
									id="_displayName"
									placeholder={t`My ${selectedProvider.name}`}
									{...register("_displayName", { required: true })}
								/>
								{errors._displayName && (
									<span className="text-xs text-destructive">
										<Trans>Required</Trans>
									</span>
								)}
							</div>

							{selectedProvider.configFields.map((field) => (
								<div key={field.name} className="space-y-2">
									<Label htmlFor={field.name}>
										{field.label}
										{field.required && (
											<span className="text-destructive ml-1">*</span>
										)}
									</Label>
									<Input
										id={field.name}
										type={field.type === "password" ? "password" : "text"}
										placeholder={field.placeholder ?? ""}
										{...register(field.name, { required: field.required })}
									/>
									{errors[field.name] && (
										<span className="text-xs text-destructive">
											<Trans>Required</Trans>
										</span>
									)}
									{field.description && (
										<p className="text-xs text-muted-foreground">
											{field.description}
										</p>
									)}
								</div>
							))}

							<Button
								type="submit"
								className="w-full"
								disabled={connecting || initializingOAuth || isPolling}
							>
								{(connecting || initializingOAuth || isPolling) && (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								)}
								{isPolling
									? t`Waiting for authorization...`
									: selectedProvider.authType === "OAUTH"
										? t`Connect & Authorize`
										: t`Connect Storage`}
							</Button>
						</form>
					)}
				</div>
			</div>

			<div className="mt-auto pt-6 text-center">
				<Button
					variant="ghost"
					size="sm"
					onClick={onNext}
					className="text-muted-foreground text-xs h-8"
				>
					{oauth === "success" ? (
						<Trans>Continue</Trans>
					) : (
						<Trans>Skip for now</Trans>
					)}
				</Button>
			</div>
		</div>
	);
}
