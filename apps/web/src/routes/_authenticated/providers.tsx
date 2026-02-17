import { createFileRoute, useSearch } from "@tanstack/react-router";
import {
	AlertTriangle,
	Cloud,
	ExternalLink,
	Github,
	Loader2,
	Plus,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "urql";
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
import { useAuthStore } from "@/features/auth/store/authStore";
import { AvailableProviderCard } from "@/features/providers/AvailableProviderCard";
import {
	AVAILABLE_PROVIDERS_QUERY,
	PROVIDERS_QUERY,
} from "@/features/providers/api/provider";
import { ConnectedProviderCard } from "@/features/providers/ConnectedProviderCard";
import { ConnectProviderDialog } from "@/features/providers/ConnectProviderDialog";
import { useProviderConnect } from "@/features/providers/hooks/useProviderConnect";
import { useProviderDisconnect } from "@/features/providers/hooks/useProviderDisconnect";
import { useProviderQuota } from "@/features/providers/hooks/useProviderQuota";
import { useProviderSync } from "@/features/providers/hooks/useProviderSync";
import { ProviderInfoPanel } from "@/features/providers/ProviderInfoPanel";
import { QuotaSettingsDialog } from "@/features/providers/QuotaSettingsDialog";
import { SyncProviderDialog } from "@/features/providers/SyncProviderDialog";
import { can, getActiveWorkspaceId } from "@/features/workspaces";
import { useWorkspaceMembers } from "@/features/workspaces/hooks/useWorkspaces";
import type { AvailableProvider, StorageProvider } from "@/gql/graphql";
import { useRightPanelStore } from "@/shared/store/rightPanelStore";

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
	const currentUserId = useAuthStore((state) => state.user?.id ?? null);
	const { connected } = useSearch({ from: "/_authenticated/providers" });
	const activeWorkspaceId = getActiveWorkspaceId() ?? "";
	const [membersResult] = useWorkspaceMembers(
		activeWorkspaceId,
		!activeWorkspaceId,
	);
	const currentWorkspaceRole =
		membersResult.data?.workspaceMembers.find(
			(member) => member.userId === currentUserId,
		)?.role ?? null;
	const canManageProviders = can(currentWorkspaceRole, "providers.manage");
	const [{ data: availableData, fetching: availableFetching }] = useQuery({
		query: AVAILABLE_PROVIDERS_QUERY,
	});
	const [
		{ data: connectedData, fetching: connectedFetching },
		refreshConnected,
	] = useQuery({ query: PROVIDERS_QUERY });

	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(
		() => refreshConnected({ requestPolicy: "network-only" }),
		[refreshConnected],
	);
	const onError = (msg: string) => setError(msg);

	const connect = useProviderConnect({ onSuccess: refresh });
	const disconnect = useProviderDisconnect({ onSuccess: refresh, onError });
	const sync = useProviderSync({ onSuccess: refresh, onError });
	const quota = useProviderQuota({ onSuccess: refresh, onError });

	// Merge errors from connect hook
	const displayError = error || connect.error;
	const clearError = () => {
		setError(null);
		connect.setError(null);
	};

	useEffect(() => {
		if (connected) {
			console.log("Provider connected successfully!");
			refresh();
		}
	}, [connected, refresh]);

	const handleOpenProviderInfo = (provider: StorageProvider) => {
		if (!canManageProviders) {
			return;
		}
		setRightPanelContent(<ProviderInfoPanel providerId={provider.id} />);
	};

	const availableProviders = (availableData?.availableProviders ||
		[]) as AvailableProvider[];
	const connectedProviders = (connectedData?.storageProviders ||
		[]) as StorageProvider[];

	const isLoading = availableFetching || connectedFetching;

	return (
		<div className="p-8 flex flex-col gap-8 h-full overflow-y-auto">
			{displayError && (
				<div className="bg-destructive/15 text-destructive p-4 rounded-lg flex items-center gap-2">
					<AlertTriangle className="h-5 w-5" />
					<span>{displayError}</span>
					<Button
						variant="ghost"
						size="sm"
						className="ml-auto h-auto p-1 text-destructive hover:bg-destructive/20"
						onClick={clearError}
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
								canManageProviders={canManageProviders}
								onDisconnect={disconnect.setDisconnectId}
								onQuota={quota.setSettingsProvider}
								onInfo={handleOpenProviderInfo}
								onSync={sync.setSyncDialogProvider}
								isDisconnecting={
									disconnect.isDisconnecting &&
									disconnect.disconnectId === provider.id
								}
								isSyncing={sync.syncingProviderId === provider.id}
								onReconnect={connect.handleInitiateOAuth}
								isReconnecting={connect.isInitiatingOAuth === provider.id}
							/>
						))}
					</div>
				)}
			</div>

			<div className="space-y-6 pt-6 border-t pb-12">
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
								canManageProviders={canManageProviders}
								onConnect={connect.setSelectedProvider}
							/>
						))}
					</div>
				)}

				<div className="flex flex-col items-center justify-center py-12 text-center space-y-4 mt-8">
					<div className="space-y-1">
						<h3 className="font-medium text-lg">
							Couldn't find what you were looking for?
						</h3>
						<p className="text-muted-foreground text-sm max-w-sm mx-auto">
							Suggest a new storage provider or report an issue on our GitHub
							repository.
						</p>
					</div>
					<Button variant="outline" asChild>
						<a
							href="https://github.com/drivebase/drivebase/issues/new?template=provider_request.md"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2"
						>
							<Github className="h-4 w-4" />
							Request a Provider
							<ExternalLink className="h-3 w-3 opacity-50" />
						</a>
					</Button>
				</div>
			</div>

			{canManageProviders && connect.selectedProvider && (
				<ConnectProviderDialog
					provider={connect.selectedProvider}
					isOpen={!!connect.selectedProvider}
					onClose={() => connect.setSelectedProvider(null)}
					onConnect={connect.handleConnect}
					isConnecting={connect.isConnecting}
				/>
			)}

			<Dialog
				open={!!disconnect.disconnectId}
				onOpenChange={(open) => !open && disconnect.setDisconnectId(null)}
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
							onClick={() => disconnect.setDisconnectId(null)}
							disabled={disconnect.isDisconnecting}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={disconnect.confirmDisconnect}
							disabled={disconnect.isDisconnecting}
						>
							{disconnect.isDisconnecting ? (
								<Loader2 className="animate-spin h-4 w-4 mr-2" />
							) : null}
							Disconnect
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<SyncProviderDialog
				isOpen={!!sync.syncDialogProvider}
				onClose={() => sync.setSyncDialogProvider(null)}
				provider={sync.syncDialogProvider}
				isSyncing={!!sync.syncingProviderId}
				onSync={sync.handleSyncProvider}
			/>

			<QuotaSettingsDialog
				isOpen={!!quota.settingsProvider}
				onClose={() => quota.setSettingsProvider(null)}
				provider={quota.settingsProvider}
				isSaving={quota.isSavingSettings}
				onSave={quota.handleSaveProviderQuota}
			/>
		</div>
	);
}
