import { useState } from "react";
import { useMutation } from "urql";

const RENAME_PROVIDER_MUTATION = `
  mutation RenameProvider($id: ID!, $name: String!) {
    renameProvider(id: $id, name: $name) {
      id
      name
      type
      authType
      isActive
      quotaUsed
      quotaTotal
      lastSyncAt
      createdAt
    }
  }
`;

interface UseProviderRenameOptions {
	onSuccess: () => void;
	onError: (message: string) => void;
}

export function useProviderRename({
	onSuccess,
	onError,
}: UseProviderRenameOptions) {
	const [isRenaming, setIsRenaming] = useState(false);
	const [, renameProvider] = useMutation(RENAME_PROVIDER_MUTATION);

	const handleRenameProvider = async (providerId: string, name: string) => {
		setIsRenaming(true);
		try {
			const result = await renameProvider({ id: providerId, name });
			if (result.error) {
				onError(`Failed to rename provider: ${result.error.message}`);
				return;
			}
			onSuccess();
		} catch (error) {
			console.error(error);
			onError("An unexpected error occurred.");
		} finally {
			setIsRenaming(false);
		}
	};

	return {
		isRenaming,
		handleRenameProvider,
	};
}
