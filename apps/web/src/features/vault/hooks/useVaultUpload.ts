import axios from "axios";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useMutation } from "urql";
import { useAuthStore } from "@/features/auth/store/authStore";
import { COMPLETE_S3_MULTIPART } from "@/features/files/api/upload-session";
import type { UploadQueueItem } from "@/features/files/UploadProgressPanel";
import {
	useInitiateVaultChunkedUpload,
	useRequestVaultUpload,
} from "@/features/vault/hooks/useVault";
import { useVaultCrypto } from "@/features/vault/hooks/useVaultCrypto";
import { encryptChunk } from "@/features/vault/lib/crypto";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/features/workspaces/api/workspace";

const CHUNK_THRESHOLD = 50 * 1024 * 1024; // 50MB
const DEFAULT_CHUNK_SIZE = 50 * 1024 * 1024; // 50MB (plaintext chunk size)
const MAX_RETRIES = 3;

interface UseVaultUploadOptions {
	currentFolderId: string | undefined;
	onUploadComplete: () => void;
}

export function useVaultUpload({
	currentFolderId,
	onUploadComplete,
}: UseVaultUploadOptions) {
	const { token } = useAuthStore();
	const { encryptForUpload } = useVaultCrypto();
	const [, requestVaultUpload] = useRequestVaultUpload();
	const [, initiateVaultChunkedUpload] = useInitiateVaultChunkedUpload();
	const [, completeS3Multipart] = useMutation(COMPLETE_S3_MULTIPART);

	const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
	const [isUploading, setIsUploading] = useState(false);

	const updateQueueItem = useCallback(
		(id: string, patch: Partial<UploadQueueItem>) => {
			setUploadQueue((prev) =>
				prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
			);
		},
		[],
	);

	const uploadSmallFile = useCallback(
		async (
			file: File,
			providerId: string,
			queueId: string,
			folderId?: string,
		) => {
			// Encrypt the file client-side
			const { encryptedBlob, encryptedFileKey } = await encryptForUpload(file);
			const encryptedSize = encryptedBlob.size;

			// Request upload slot
			const result = await requestVaultUpload({
				input: {
					name: file.name,
					mimeType: file.type,
					size: encryptedSize,
					folderId,
					providerId,
					encryptedFileKey,
				},
			});

			if (result.error || !result.data?.requestVaultUpload) {
				throw new Error(
					result.error?.message ?? "Failed to request vault upload",
				);
			}

			const { uploadUrl, uploadFields, useDirectUpload, fileId } =
				result.data.requestVaultUpload;

			if (useDirectUpload && uploadUrl) {
				// Direct upload (S3 presigned URL)
				if (uploadFields) {
					const formData = new FormData();
					const fields = uploadFields as Record<string, string>;
					for (const [key, value] of Object.entries(fields)) {
						formData.append(key, value);
					}
					formData.append("file", encryptedBlob);

					const response = await fetch(uploadUrl, {
						method: "POST",
						body: formData,
					});

					if (!response.ok) {
						throw new Error(`Direct upload failed: ${response.status}`);
					}
				} else {
					const response = await fetch(uploadUrl, {
						method: "PUT",
						body: encryptedBlob,
					});
					if (!response.ok) {
						throw new Error(`Direct upload failed: ${response.status}`);
					}
				}
			} else if (uploadUrl) {
				// Proxy upload — must be POST (proxy endpoint accepts POST only)
				const workspaceId = localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
				await axios.post(uploadUrl, encryptedBlob, {
					headers: {
						"Content-Type": "application/octet-stream",
						...(token ? { Authorization: `Bearer ${token}` } : {}),
						...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
					},
					onUploadProgress: (evt) => {
						if (evt.total) {
							const progress = Math.round((evt.loaded / evt.total) * 100);
							updateQueueItem(queueId, { progress });
						}
					},
				});
			}

			return fileId;
		},
		[encryptForUpload, requestVaultUpload, token, updateQueueItem],
	);

	const uploadLargeFileChunked = useCallback(
		async (
			file: File,
			providerId: string,
			queueId: string,
			folderId?: string,
		) => {
			const { generateFileKey, encryptFileKey, importPublicKey } = await import(
				"@/features/vault/lib/crypto"
			);
			const { useVaultStore } = await import(
				"@/features/vault/store/vaultStore"
			);

			const store = useVaultStore.getState();
			if (!store.publicKey) {
				throw new Error("Vault not set up");
			}

			const publicKeyJwk: JsonWebKey = JSON.parse(store.publicKey);
			const publicKey = await importPublicKey(publicKeyJwk);
			const fileKey = await generateFileKey();
			const encryptedFileKey = await encryptFileKey(fileKey, publicKey);

			// Encrypted chunk size = plaintext chunk size + 12 (IV) + 16 (AES-GCM tag)
			const encryptedChunkSize = DEFAULT_CHUNK_SIZE + 28;
			const totalChunks = Math.ceil(file.size / DEFAULT_CHUNK_SIZE);

			// Initiate vault chunked upload
			const initResult = await initiateVaultChunkedUpload({
				input: {
					name: file.name,
					mimeType: file.type,
					totalSize: file.size + totalChunks * 28, // total encrypted size
					chunkSize: encryptedChunkSize,
					folderId,
					providerId,
					encryptedFileKey,
					encryptedChunkSize: DEFAULT_CHUNK_SIZE,
				},
			});

			if (initResult.error || !initResult.data?.initiateVaultChunkedUpload) {
				throw new Error(
					initResult.error?.message ??
						"Failed to initiate vault chunked upload",
				);
			}

			const {
				sessionId,
				totalChunks: serverTotalChunks,
				useDirectUpload,
				presignedPartUrls,
			} = initResult.data.initiateVaultChunkedUpload;

			updateQueueItem(queueId, {
				status: "uploading",
				progress: 0,
				sessionId,
				phase: "client_to_server",
				canCancel: true,
			});

			if (useDirectUpload && presignedPartUrls) {
				// S3 direct multipart with encrypted chunks
				const parts: Array<{ partNumber: number; etag: string }> = [];

				for (let i = 0; i < serverTotalChunks; i++) {
					const start = i * DEFAULT_CHUNK_SIZE;
					const end = Math.min(start + DEFAULT_CHUNK_SIZE, file.size);
					const plaintextChunk = await file.slice(start, end).arrayBuffer();
					const encryptedChunkBuffer = await encryptChunk(
						plaintextChunk,
						fileKey,
						i,
					);

					const partUrl = presignedPartUrls[i];
					if (!partUrl) {
						throw new Error(`Missing presigned URL for part ${i + 1}`);
					}

					let etag: string | undefined;
					let lastError: Error | undefined;

					for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
						try {
							const response = await fetch(partUrl.url, {
								method: "PUT",
								body: encryptedChunkBuffer,
							});

							if (!response.ok) {
								throw new Error(`S3 part upload failed: ${response.status}`);
							}

							etag = response.headers.get("etag") ?? undefined;
							if (!etag) {
								throw new Error("S3 did not return ETag for part");
							}
							lastError = undefined;
							break;
						} catch (error) {
							lastError =
								error instanceof Error ? error : new Error(String(error));
							if (attempt < MAX_RETRIES - 1) {
								await new Promise((resolve) =>
									setTimeout(resolve, 1000 * 2 ** attempt),
								);
							}
						}
					}

					if (lastError) throw lastError;
					parts.push({ partNumber: partUrl.partNumber, etag: etag as string });

					const progress = Math.round(((i + 1) / serverTotalChunks) * 100);
					updateQueueItem(queueId, { progress, phase: "client_to_server" });
				}

				// Complete S3 multipart
				const completeResult = await completeS3Multipart({ sessionId, parts });
				if (completeResult.error) {
					throw new Error(
						completeResult.error.message ?? "Failed to complete S3 upload",
					);
				}
			} else {
				// Proxy chunked upload with encryption
				const apiUrl =
					import.meta.env.VITE_PUBLIC_API_URL?.replace("/graphql", "") ??
					"http://localhost:4000";

				for (let i = 0; i < serverTotalChunks; i++) {
					const start = i * DEFAULT_CHUNK_SIZE;
					const end = Math.min(start + DEFAULT_CHUNK_SIZE, file.size);
					const plaintextChunk = await file.slice(start, end).arrayBuffer();
					const encryptedChunkBuffer = await encryptChunk(
						plaintextChunk,
						fileKey,
						i,
					);

					let lastError: Error | undefined;

					for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
						try {
							const wsId = localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
							const response = await fetch(
								`${apiUrl}/api/upload/chunk?sessionId=${sessionId}&chunkIndex=${i}`,
								{
									method: "POST",
									headers: {
										"Content-Type": "application/octet-stream",
										...(token ? { Authorization: `Bearer ${token}` } : {}),
										...(wsId ? { "x-workspace-id": wsId } : {}),
									},
									body: encryptedChunkBuffer,
								},
							);

							if (!response.ok) {
								throw new Error(`Chunk upload failed: ${response.status}`);
							}

							lastError = undefined;
							break;
						} catch (error) {
							lastError =
								error instanceof Error ? error : new Error(String(error));
							if (attempt < MAX_RETRIES - 1) {
								await new Promise((resolve) =>
									setTimeout(resolve, 1000 * 2 ** attempt),
								);
							}
						}
					}

					if (lastError) throw lastError;

					const progress = Math.round(((i + 1) / serverTotalChunks) * 50);
					updateQueueItem(queueId, { progress, phase: "client_to_server" });
				}

				updateQueueItem(queueId, {
					status: "uploading",
					progress: 50,
					phase: "server_to_provider",
				});
			}

			return sessionId;
		},
		[initiateVaultChunkedUpload, completeS3Multipart, token, updateQueueItem],
	);

	const uploadFile = useCallback(
		async (file: File, providerId: string) => {
			const queueId = `vault-${Date.now()}-${file.name}`;

			setUploadQueue((prev) => [
				...prev,
				{
					id: queueId,
					name: file.name,
					size: file.size,
					progress: 0,
					status: "queued",
				},
			]);

			try {
				updateQueueItem(queueId, { status: "uploading", progress: 0 });

				if (file.size > CHUNK_THRESHOLD) {
					await uploadLargeFileChunked(
						file,
						providerId,
						queueId,
						currentFolderId,
					);
				} else {
					await uploadSmallFile(file, providerId, queueId, currentFolderId);
				}

				updateQueueItem(queueId, { status: "success", progress: 100 });
				onUploadComplete();
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Upload failed";
				updateQueueItem(queueId, { status: "error", error: message });
				toast.error(`Failed to upload ${file.name}: ${message}`);
			}
		},
		[
			currentFolderId,
			uploadSmallFile,
			uploadLargeFileChunked,
			updateQueueItem,
			onUploadComplete,
		],
	);

	const uploadFiles = useCallback(
		async (files: File[], providerId: string) => {
			setIsUploading(true);
			try {
				for (const file of files) {
					await uploadFile(file, providerId);
				}
			} finally {
				setIsUploading(false);
			}
		},
		[uploadFile],
	);

	const clearQueue = useCallback(() => {
		setUploadQueue((prev) =>
			prev.filter((item) => item.status === "uploading"),
		);
	}, []);

	return {
		uploadFiles,
		uploadQueue,
		isUploading,
		clearQueue,
	};
}
