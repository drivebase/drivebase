import { useCallback } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
	useDeleteVaultFile,
	useRenameVaultFile,
	useRequestVaultDownload,
	useStarVaultFile,
	useUnstarVaultFile,
} from "@/features/vault/hooks/useVault";
import { useVaultCrypto } from "@/features/vault/hooks/useVaultCrypto";

interface VaultFile {
	id: string;
	name: string;
	mimeType: string;
}

function mergeChunks(chunks: Uint8Array[], totalLength: number): ArrayBuffer {
	const merged = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.length;
	}
	return merged.buffer;
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
			const toastId = `vault-download-${file.id}-${Date.now()}`;
			try {
				toast.loading(`Downloading ${file.name}... 0%`, { id: toastId });

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

				let encryptedBuffer: ArrayBuffer;
				const totalBytes = Number(
					response.headers.get("content-length") ?? "0",
				);
				if (response.body && totalBytes > 0) {
					const reader = response.body.getReader();
					const chunks: Uint8Array[] = [];
					let loaded = 0;

					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						if (!value) continue;
						chunks.push(value);
						loaded += value.length;
						const percent = Math.min(
							90,
							Math.round((loaded / totalBytes) * 90),
						);
						toast.loading(`Downloading ${file.name}... ${percent}%`, {
							id: toastId,
						});
					}

					encryptedBuffer = mergeChunks(chunks, loaded);
				} else {
					encryptedBuffer = await response.arrayBuffer();
					toast.loading(`Downloading ${file.name}...`, { id: toastId });
				}

				// Decrypt client-side
				toast.loading(`Decrypting ${file.name}...`, { id: toastId });
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
				toast.success(`Downloaded ${file.name}`, { id: toastId });
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Download failed";
				toast.error(`Failed to download ${file.name}: ${message}`, {
					id: toastId,
				});
			}
		},
		[requestVaultDownload, decryptDownload, token],
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
