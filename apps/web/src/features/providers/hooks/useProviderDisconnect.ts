import { useState } from "react";
import { useMutation } from "urql";
import { DISCONNECT_PROVIDER_MUTATION } from "@/features/providers/api/provider";

interface UseProviderDisconnectOptions {
	onSuccess: () => void;
	onError: (message: string) => void;
}

export function useProviderDisconnect({
	onSuccess,
	onError,
}: UseProviderDisconnectOptions) {
	const [, disconnectProvider] = useMutation(DISCONNECT_PROVIDER_MUTATION);
	const [disconnectId, setDisconnectId] = useState<string | null>(null);
	const [isDisconnecting, setIsDisconnecting] = useState(false);

	const confirmDisconnect = async () => {
		if (!disconnectId) return;
		setIsDisconnecting(true);
		try {
			const result = await disconnectProvider({ id: disconnectId });
			if (result.error) {
				onError(`Failed to disconnect: ${result.error.message}`);
			} else {
				onSuccess();
				setDisconnectId(null);
			}
		} catch (err) {
			console.error(err);
			onError("An unexpected error occurred.");
		} finally {
			setIsDisconnecting(false);
		}
	};

	return {
		disconnectId,
		setDisconnectId,
		isDisconnecting,
		confirmDisconnect,
	};
}
