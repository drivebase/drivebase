import { useCallback } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useVaultCrypto } from "@/features/vault/hooks/useVaultCrypto";
import {
	useDeleteVaultFile,
	useRenameVaultFile,
	useRequestVaultDownload,
	useStarVaultFile,
	useUnstarVaultFile,
} from "@/features/vault/hooks/useVault";

interface VaultFile {
	id: string;
	name: string;
	mimeType: string;
}

export function useVaultFileActions(onRefresh?: () => void) {
	const { token } = useAuthStore();
	const { decryptDownload } = useVaultCrypto();
	const [, requestVaultDownload] = useRequestVaultDownload();
	const [, deleteVaultFile] = useDeleteVaultFile();
	const [, renameVaultFile] = useRenameVaultFile();
	const [, starVaultFile] = useStarVaultFile();
	const [, unstarVaultFile] = useUnstarVaultFile();

	/**
	 * Download and decrypt a vault file, then trigger browser save.
	 */
	const downloadFile = useCallback(
		async (file: VaultFile) => {
			try {
				// Get download URL + encrypted file key from server
				const result = await requestVaultDownload({ id: file.id });

				if (result.error || !result.data?.requestVaultDownload) {
					throw new Error(
						result.error?.message ?? "Failed to get download URL",
					);
				}

				const { downloadUrl, encryptedFileKey } =
					result.data.requestVaultDownload;

				if (!downloadUrl) {
					throw new Error("No download URL returned");
				}

				// Fetch the encrypted file — include auth token for proxy downloads
				const response = await fetch(downloadUrl, {
					headers: token ? { Authorization: `Bearer ${token}` } : {},
				});
				if (!response.ok) {
					throw new Error(`Failed to fetch encrypted file: ${response.status}`);
				}

				const encryptedBuffer = await response.arrayBuffer();

				// Decrypt client-side
				const decryptedBuffer = await decryptDownload(
					encryptedBuffer,
					encryptedFileKey,
				);

				// Trigger browser download of decrypted file
				const blob = new Blob([decryptedBuffer], { type: file.mimeType });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = file.name;
				a.click();
				URL.revokeObjectURL(url);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Download failed";
				toast.error(`Failed to download ${file.name}: ${message}`);
			}
		},
		[requestVaultDownload, decryptDownload],
	);

	/**
	 * Delete a vault file.
	 */
	const deleteFile = useCallback(
		async (fileId: string) => {
			const result = await deleteVaultFile({ id: fileId });
			if (result.error) {
				toast.error("Failed to delete file");
				return false;
			}
			onRefresh?.();
			return true;
		},
		[deleteVaultFile, onRefresh],
	);

	/**
	 * Rename a vault file.
	 */
	const renameFile = useCallback(
		async (fileId: string, newName: string) => {
			const result = await renameVaultFile({ id: fileId, name: newName });
			if (result.error) {
				toast.error("Failed to rename file");
				return false;
			}
			onRefresh?.();
			return true;
		},
		[renameVaultFile, onRefresh],
	);

	/**
	 * Toggle star on a vault file.
	 */
	const toggleStar = useCallback(
		async (fileId: string, currentlyStarred: boolean) => {
			const result = currentlyStarred
				? await unstarVaultFile({ id: fileId })
				: await starVaultFile({ id: fileId });

			if (result.error) {
				toast.error("Failed to update star");
				return false;
			}
			onRefresh?.();
			return true;
		},
		[starVaultFile, unstarVaultFile, onRefresh],
	);

	return {
		downloadFile,
		deleteFile,
		renameFile,
		toggleStar,
	};
}
