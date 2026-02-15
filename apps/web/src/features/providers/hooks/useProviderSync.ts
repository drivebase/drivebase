import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useSubscription } from "urql";
import {
	PROVIDER_SYNC_PROGRESS_SUBSCRIPTION,
	SYNC_PROVIDER_MUTATION,
} from "@/features/providers/api/provider";
import type { StorageProvider, SyncOptionsInput } from "@/gql/graphql";

interface UseProviderSyncOptions {
	onSuccess: () => void;
	onError: (message: string) => void;
}

export function useProviderSync({
	onSuccess,
	onError,
}: UseProviderSyncOptions) {
	const [, syncProvider] = useMutation(SYNC_PROVIDER_MUTATION);
	const [syncingProviderId, setSyncingProviderId] = useState<string | null>(
		null,
	);
	const [syncDialogProvider, setSyncDialogProvider] =
		useState<StorageProvider | null>(null);

	const [{ data: syncProgress }] = useSubscription({
		query: PROVIDER_SYNC_PROGRESS_SUBSCRIPTION,
		variables: { providerId: syncingProviderId || "" },
		pause: !syncingProviderId,
	});

	useEffect(() => {
		if (!syncProgress?.providerSyncProgress || !syncingProviderId) return;
		const { status, message, processed } = syncProgress.providerSyncProgress;
		const toastId = `sync-${syncingProviderId}`;

		if (status === "running") {
			toast.loading(message || `Syncing... processed ${processed} items`, {
				id: toastId,
			});
		} else if (status === "completed") {
			toast.success(message || "Sync completed successfully!", {
				id: toastId,
			});
		} else if (status === "error") {
			toast.error(message || "Sync failed", {
				id: toastId,
			});
		}
	}, [syncProgress, syncingProviderId]);

	const handleSyncProvider = async (id: string, options: SyncOptionsInput) => {
		setSyncingProviderId(id);
		try {
			const result = await syncProvider({ id, options });
			if (result.error) {
				onError(`Failed to sync provider: ${result.error.message}`);
				return;
			}
			await onSuccess();
		} catch (e) {
			console.error(e);
			onError("An unexpected error occurred while syncing provider.");
		} finally {
			setSyncingProviderId(null);
		}
	};

	return {
		syncingProviderId,
		syncDialogProvider,
		setSyncDialogProvider,
		handleSyncProvider,
	};
}
