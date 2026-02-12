import { createFileRoute, useSearch } from "@tanstack/react-router";
import { AlertTriangle, Cloud, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "urql";
import {
	AVAILABLE_PROVIDERS_QUERY,
	CONNECT_PROVIDER_MUTATION,
	DISCONNECT_PROVIDER_MUTATION,
	INITIATE_PROVIDER_OAUTH_MUTATION,
	PROVIDERS_QUERY,
	SYNC_PROVIDER_MUTATION,
	UPDATE_PROVIDER_QUOTA_MUTATION,
} from "@/api/provider";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AvailableProviderCard } from "@/features/providers/AvailableProviderCard";
import { ConnectedProviderCard } from "@/features/providers/ConnectedProviderCard";
import { ConnectProviderDialog } from "@/features/providers/ConnectProviderDialog";
import { ProviderInfoPanel } from "@/features/providers/ProviderInfoPanel";
import { QuotaSettingsDialog } from "@/features/providers/QuotaSettingsDialog";
import {
	AuthType,
	type AvailableProvider,
	type ProviderType,
	type StorageProvider,
} from "@/gql/graphql";
import { useRightPanelStore } from "@/store/rightPanelStore";

export const Route = createFileRoute("/_authenticated/providers")({
	component: ProvidersPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			connected: search.connected === "true" ? true : undefined,
		};
	},
});

function ProvidersPage() {
	const setRightPanelContent = useRightPanelStore((state) => state.setContent);
	const { connected } = useSearch({ from: "/_authenticated/providers" });
	const [{ data: availableData, fetching: availableFetching }] = useQuery({
		query: AVAILABLE_PROVIDERS_QUERY,
	});
	const [
		{ data: connectedData, fetching: connectedFetching },
		refreshConnected,
	] = useQuery({ query: PROVIDERS_QUERY });

	const [, connectProvider] = useMutation(CONNECT_PROVIDER_MUTATION);
	const [, disconnectProvider] = useMutation(DISCONNECT_PROVIDER_MUTATION);
	const [, initiateOAuth] = useMutation(INITIATE_PROVIDER_OAUTH_MUTATION);
	const [, syncProvider] = useMutation(SYNC_PROVIDER_MUTATION);
	const [, updateProviderQuota] = useMutation(UPDATE_PROVIDER_QUOTA_MUTATION);

	const [selectedProvider, setSelectedProvider] =
		useState<AvailableProvider | null>(null);
	const [disconnectId, setDisconnectId] = useState<string | null>(null);
	const [isDisconnecting, setIsDisconnecting] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [isInitiatingOAuth, setIsInitiatingOAuth] = useState<string | null>(
		null,
	);
	const [settingsProvider, setSettingsProvider] =
		useState<StorageProvider | null>(null);
	const [isSavingSettings, setIsSavingSettings] = useState(false);
	const [syncingProviderId, setSyncingProviderId] = useState<string | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (connected) {
			// In a real app, use a toast here
			console.log("Provider connected successfully!");
			refreshConnected({ requestPolicy: "network-only" });
		}
	}, [connected, refreshConnected]);

	const handleConnect = async (formData: Record<string, unknown>) => {
		if (!selectedProvider) return;
		setIsConnecting(true);
		setError(null);
		try {
			// Extract custom name from form data, rest is config
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

			refreshConnected({ requestPolicy: "network-only" });
			setSelectedProvider(null);
		} catch (error) {
			console.error(error);
			setError("An unexpected error occurred.");
		} finally {
			setIsConnecting(false);
		}
	};

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
		} catch (error) {
			console.error(error);
			setError("An unexpected error occurred.");
		} finally {
			setIsInitiatingOAuth(null);
		}
	};

	const handleDisconnectClick = (id: string) => {
		setDisconnectId(id);
	};

	const handleOpenProviderInfo = (provider: StorageProvider) => {
		setRightPanelContent(<ProviderInfoPanel providerId={provider.id} />);
	};

	const handleSyncProvider = async (id: string) => {
		setSyncingProviderId(id);
		try {
			const result = await syncProvider({ id });
			if (result.error) {
				setError(`Failed to sync provider: ${result.error.message}`);
				return null;
			}

			await refreshConnected({ requestPolicy: "network-only" });
			return (result.data?.syncProvider as StorageProvider | undefined) ?? null;
		} catch (e) {
			console.error(e);
			setError("An unexpected error occurred while syncing provider.");
			return null;
		} finally {
			setSyncingProviderId(null);
		}
	};

	const handleSaveProviderQuota = async (input: {
		id: string;
		quotaTotal: number;
		quotaUsed: number;
	}) => {
		setIsSavingSettings(true);
		try {
			const result = await updateProviderQuota({
				input: {
					id: input.id,
					quotaTotal: input.quotaTotal,
					quotaUsed: input.quotaUsed,
				},
			});

			if (result.error) {
				setError(`Failed to update provider settings: ${result.error.message}`);
				return;
			}

			await refreshConnected({ requestPolicy: "network-only" });
			setSettingsProvider(null);
		} catch (e) {
			console.error(e);
			setError(
				"An unexpected error occurred while updating provider settings.",
			);
		} finally {
			setIsSavingSettings(false);
		}
	};

	const confirmDisconnect = async () => {
		if (!disconnectId) return;
		setIsDisconnecting(true);
		try {
			const result = await disconnectProvider({ id: disconnectId });
			if (result.error) {
				setError(`Failed to disconnect: ${result.error.message}`);
			} else {
				refreshConnected({ requestPolicy: "network-only" });
				setDisconnectId(null);
			}
		} catch (error) {
			console.error(error);
			setError("An unexpected error occurred.");
		} finally {
			setIsDisconnecting(false);
		}
	};

	const availableProviders = (availableData?.availableProviders ||
		[]) as AvailableProvider[];
	const connectedProviders = (connectedData?.storageProviders ||
		[]) as StorageProvider[];

	const isLoading = availableFetching || connectedFetching;

	return (
		<div className="p-8 flex flex-col gap-8 h-full overflow-y-auto">
			{error && (
				<div className="bg-destructive/15 text-destructive p-4 rounded-lg flex items-center gap-2">
					<AlertTriangle className="h-5 w-5" />
					<span>{error}</span>
					<Button
						variant="ghost"
						size="sm"
						className="ml-auto h-auto p-1 text-destructive hover:bg-destructive/20"
						onClick={() => setError(null)}
					>
						Dismiss
					</Button>
				</div>
			)}

			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold flex items-center gap-2">
						<Cloud className="h-5 w-5 text-primary" />
						Connected Storage
					</h2>
				</div>

				{isLoading && connectedProviders.length === 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{[1, 2].map((i) => (
							<div key={i} className="border rounded-lg p-6 space-y-4">
								<div className="flex items-center gap-4">
									<Skeleton className="h-10 w-10 rounded-md" />
									<div className="space-y-2">
										<Skeleton className="h-4 w-32" />
										<Skeleton className="h-3 w-20" />
									</div>
								</div>
								<Skeleton className="h-2 w-full mt-4" />
							</div>
						))}
					</div>
				) : connectedProviders.length === 0 ? (
					<div className="text-center py-12 bg-muted/30 border border-dashed rounded-xl">
						<h3 className="font-semibold text-lg">No providers connected</h3>
						<p className="text-muted-foreground max-w-sm mx-auto mt-1 mb-6">
							Connect a storage provider below to start managing your files.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
						{connectedProviders.map((provider) => (
							<ConnectedProviderCard
								key={provider.id}
								provider={provider}
								onDisconnect={handleDisconnectClick}
								onQuota={setSettingsProvider}
								onInfo={handleOpenProviderInfo}
								onSync={handleSyncProvider}
								isDisconnecting={
									isDisconnecting && disconnectId === provider.id
								}
								isSyncing={syncingProviderId === provider.id}
								onReconnect={handleInitiateOAuth}
								isReconnecting={isInitiatingOAuth === provider.id}
							/>
						))}
					</div>
				)}
			</div>

			<div className="space-y-6 pt-6 border-t">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold flex items-center gap-2">
						<Plus className="h-5 w-5 text-primary" />
						Available Providers
					</h2>
				</div>

				{isLoading && availableProviders.length === 0 ? (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
						{[1, 2, 3].map((i) => (
							<Skeleton key={i} className="h-48 w-full rounded-xl" />
						))}
					</div>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
						{availableProviders.map((provider) => (
							<AvailableProviderCard
								key={provider.id}
								provider={provider}
								onConnect={setSelectedProvider}
							/>
						))}
					</div>
				)}
			</div>

			{/* Connect Dialog */}
			{selectedProvider && (
				<ConnectProviderDialog
					provider={selectedProvider}
					isOpen={!!selectedProvider}
					onClose={() => setSelectedProvider(null)}
					onConnect={handleConnect}
					isConnecting={isConnecting}
				/>
			)}

			{/* Disconnect Confirmation Dialog */}
			<Dialog
				open={!!disconnectId}
				onOpenChange={(open) => !open && setDisconnectId(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Disconnect Provider?</DialogTitle>
						<DialogDescription>
							Are you sure you want to disconnect this storage provider? Your
							files will strictly remain in the remote storage, but you won't be
							able to access them here until you reconnect.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setDisconnectId(null)}
							disabled={isDisconnecting}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={confirmDisconnect}
							disabled={isDisconnecting}
						>
							{isDisconnecting ? (
								<Loader2 className="animate-spin h-4 w-4 mr-2" />
							) : null}
							Disconnect
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<QuotaSettingsDialog
				isOpen={!!settingsProvider}
				onClose={() => setSettingsProvider(null)}
				provider={settingsProvider}
				isSaving={isSavingSettings}
				onSave={handleSaveProviderQuota}
			/>
		</div>
	);
}
