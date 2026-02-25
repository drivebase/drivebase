import { useState } from "react";
import { useMutation } from "urql";
import { SYNC_PROVIDER_MUTATION } from "@/features/providers/api/provider";
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
