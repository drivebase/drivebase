import { useState } from "react";
import { useMutation } from "urql";
import { UPDATE_PROVIDER_QUOTA_MUTATION } from "@/features/providers/api/provider";
import type { StorageProvider } from "@/gql/graphql";

interface UseProviderQuotaOptions {
	onSuccess: () => void;
	onError: (message: string) => void;
}

export function useProviderQuota({
	onSuccess,
	onError,
}: UseProviderQuotaOptions) {
	const [, updateProviderQuota] = useMutation(UPDATE_PROVIDER_QUOTA_MUTATION);
	const [settingsProvider, setSettingsProvider] =
		useState<StorageProvider | null>(null);
	const [isSavingSettings, setIsSavingSettings] = useState(false);

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
				onError(`Failed to update provider settings: ${result.error.message}`);
				return;
			}

			await onSuccess();
			setSettingsProvider(null);
		} catch (e) {
			console.error(e);
			onError("An unexpected error occurred while updating provider settings.");
		} finally {
			setIsSavingSettings(false);
		}
	};

	return {
		settingsProvider,
		setSettingsProvider,
		isSavingSettings,
		handleSaveProviderQuota,
	};
}
