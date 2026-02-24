import { useCallback, useEffect, useRef } from "react";
import { useMutation, useSubscription } from "urql";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
	CANCEL_UPLOAD_SESSION,
	COMPLETE_S3_MULTIPART,
	INITIATE_CHUNKED_UPLOAD,
	RETRY_UPLOAD_SESSION,
	UPLOAD_PROGRESS_SUBSCRIPTION,
} from "@/features/files/api/upload-session";
import type { UploadQueueItem } from "@/features/files/UploadProgressPanel";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/features/workspaces/api/workspace";

const DEFAULT_CHUNK_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_RETRIES = 3;

interface ChunkedUploadCallbacks {
	onProgress: (id: string, item: Partial<UploadQueueItem>) => void;
}

export function useChunkedUpload(callbacks: ChunkedUploadCallbacks) {
	const { token } = useAuthStore();
	const [, initiateChunkedUpload] = useMutation(INITIATE_CHUNKED_UPLOAD);
	const [, completeS3Multipart] = useMutation(COMPLETE_S3_MULTIPART);
	const [, cancelUploadSession] = useMutation(CANCEL_UPLOAD_SESSION);
	const [, retryUploadSession] = useMutation(RETRY_UPLOAD_SESSION);

	// Track active session IDs for subscriptions
	const activeSessionRef = useRef<string | null>(null);
	const queueBySessionRef = useRef<Map<string, string>>(new Map());

	// Subscribe to upload progress for the active session
	const [{ data: progressData }] = useSubscription({
		query: UPLOAD_PROGRESS_SUBSCRIPTION,
		variables: { sessionId: activeSessionRef.current ?? "" },
		pause: !activeSessionRef.current,
	});

	useEffect(() => {
		const progress = progressData?.uploadProgress;
		if (!progress) return;

		const queueId =
			queueBySessionRef.current.get(progress.sessionId) ??
			`session-${progress.sessionId}`;

		const totalChunks = Math.max(progress.totalChunks, 1);
		const totalSize = Math.max(progress.totalSize, 1);
		const computedProgress =
			progress.status === "completed"
				? 100
				: progress.phase === "client_to_server"
					? Math.round((progress.receivedChunks / totalChunks) * 50)
					: Math.round(
							50 + (progress.providerBytesTransferred / totalSize) * 50,
						);

		const status =
			progress.status === "completed"
				? "success"
				: progress.status === "failed"
					? "error"
					: progress.status === "cancelled"
						? "cancelled"
						: progress.status === "transferring"
							? "transferring"
							: "uploading";

		callbacks.onProgress(queueId, {
			progress: Math.max(0, Math.min(100, computedProgress)),
			status,
			phase:
				progress.phase === "client_to_server" ||
				progress.phase === "server_to_provider"
					? progress.phase
					: undefined,
			error: progress.errorMessage ?? undefined,
			canCancel:
				progress.status !== "completed" &&
				progress.status !== "failed" &&
				progress.status !== "cancelled",
			canRetry: progress.status === "failed",
		});

		if (
			progress.status === "completed" ||
			progress.status === "failed" ||
			progress.status === "cancelled"
		) {
			queueBySessionRef.current.delete(progress.sessionId);
			if (activeSessionRef.current === progress.sessionId) {
				activeSessionRef.current = null;
			}
		}
	}, [progressData, callbacks]);

	const uploadS3Direct = useCallback(
		async (
			file: File,
			sessionId: string,
			totalChunks: number,
			chunkSize: number,
			presignedPartUrls: ReadonlyArray<{ partNumber: number; url: string }>,
			queueId: string,
		): Promise<boolean> => {
			const parts: Array<{ partNumber: number; etag: string }> = [];

			for (let i = 0; i < totalChunks; i++) {
				const start = i * chunkSize;
				const end = Math.min(start + chunkSize, file.size);
				const chunk = file.slice(start, end);

				const partUrl = presignedPartUrls[i];
				if (!partUrl) {
					throw new Error(`Missing presigned URL for part ${i + 1}`);
				}

				let lastError: Error | undefined;
				let etag: string | undefined;

				for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
					try {
						const response = await fetch(partUrl.url, {
							method: "PUT",
							body: chunk,
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

				const progress = Math.round(((i + 1) / totalChunks) * 100);
				callbacks.onProgress(queueId, {
					progress,
					phase: "client_to_server",
				});
			}

			// Complete the S3 multipart upload
			const completeResult = await completeS3Multipart({
				sessionId,
				parts,
			});

			if (completeResult.error) {
				throw new Error(
					completeResult.error.message ?? "Failed to complete S3 upload",
				);
			}

			callbacks.onProgress(queueId, {
				status: "success",
				progress: 100,
				phase: "server_to_provider",
			});

			return true;
		},
		[callbacks, completeS3Multipart],
	);

	const uploadProxyChunks = useCallback(
		async (
			file: File,
			sessionId: string,
			totalChunks: number,
			chunkSize: number,
			queueId: string,
		): Promise<boolean> => {
			const apiUrl =
				import.meta.env.VITE_PUBLIC_API_URL?.replace("/graphql", "") ??
				"http://localhost:4000";

			for (let i = 0; i < totalChunks; i++) {
				const start = i * chunkSize;
				const end = Math.min(start + chunkSize, file.size);
				const chunk = file.slice(start, end);

				let lastError: Error | undefined;

				for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
					try {
						const workspaceId = localStorage.getItem(
							ACTIVE_WORKSPACE_STORAGE_KEY,
						);
						const response = await fetch(
							`${apiUrl}/api/upload/chunk?sessionId=${sessionId}&chunkIndex=${i}`,
							{
								method: "POST",
								headers: {
									"Content-Type": "application/octet-stream",
									...(token ? { Authorization: `Bearer ${token}` } : {}),
									...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
								},
								body: chunk,
							},
						);

						if (!response.ok) {
							const errorText = await response.text();
							throw new Error(`Chunk upload failed: ${errorText}`);
						}

						const data = (await response.json()) as {
							success: boolean;
							isComplete: boolean;
						};

						if (data.isComplete) {
							// All chunks received, server will assemble and enqueue
							callbacks.onProgress(queueId, {
								progress: 50,
								phase: "server_to_provider",
								status: "uploading",
							});
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

				// Progress for client_to_server phase: 0-50%
				const chunkProgress = Math.round(((i + 1) / totalChunks) * 50);
				callbacks.onProgress(queueId, {
					progress: chunkProgress,
					phase: "client_to_server",
				});
			}

			// After all chunks sent, the server handles assembly and provider transfer
			// The subscription provides real-time progress for the server_to_provider phase.
			callbacks.onProgress(queueId, {
				status: "uploading",
				progress: 50,
				phase: "server_to_provider",
			});

			return true;
		},
		[callbacks, token],
	);

	const uploadChunked = useCallback(
		async (
			file: File,
			providerId: string,
			queueId: string,
			currentFolderId?: string,
		): Promise<boolean> => {
			try {
				// 1. Initiate chunked upload session
				const result = await initiateChunkedUpload({
					input: {
						name: file.name,
						mimeType: file.type,
						totalSize: file.size,
						chunkSize: DEFAULT_CHUNK_SIZE,
						folderId: currentFolderId,
						providerId,
					},
				});

				if (result.error || !result.data?.initiateChunkedUpload) {
					throw new Error(
						result.error?.message ?? "Failed to initiate chunked upload",
					);
				}

				const {
					sessionId,
					totalChunks,
					chunkSize,
					useDirectUpload,
					presignedPartUrls,
				} = result.data.initiateChunkedUpload;

				activeSessionRef.current = sessionId;
				queueBySessionRef.current.set(sessionId, queueId);

				callbacks.onProgress(queueId, {
					status: "uploading",
					progress: 0,
					sessionId,
					phase: "client_to_server",
					canCancel: true,
				});

				if (useDirectUpload && presignedPartUrls) {
					// 2a. S3 direct multipart path
					return await uploadS3Direct(
						file,
						sessionId,
						totalChunks,
						chunkSize,
						presignedPartUrls,
						queueId,
					);
				}

				// 2b. Proxy chunked upload path
				return await uploadProxyChunks(
					file,
					sessionId,
					totalChunks,
					chunkSize,
					queueId,
				);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Chunked upload failed";
				callbacks.onProgress(queueId, {
					status: "error",
					error: message,
					progress: 100,
				});
				return false;
			}
		},
		[initiateChunkedUpload, callbacks, uploadS3Direct, uploadProxyChunks],
	);

	const cancelSession = useCallback(
		async (sessionId: string) => {
			await cancelUploadSession({ sessionId });
		},
		[cancelUploadSession],
	);

	const retrySession = useCallback(
		async (sessionId: string) => {
			await retryUploadSession({ sessionId });
		},
		[retryUploadSession],
	);

	return {
		uploadChunked,
		cancelSession,
		retrySession,
	};
}
