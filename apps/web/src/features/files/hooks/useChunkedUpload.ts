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
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/features/workspaces/api/workspace";
import { progressPanel } from "@/shared/lib/progressPanel";

const DEFAULT_CHUNK_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_RETRIES = 3;

export function useChunkedUpload() {
	const { token } = useAuthStore();
	const [, initiateChunkedUpload] = useMutation(INITIATE_CHUNKED_UPLOAD);
	const [, completeS3Multipart] = useMutation(COMPLETE_S3_MULTIPART);
	const [, cancelUploadSession] = useMutation(CANCEL_UPLOAD_SESSION);
	const [, retryUploadSession] = useMutation(RETRY_UPLOAD_SESSION);

	// Maps sessionId → progressPanel itemId
	const sessionToPpId = useRef<Map<string, string>>(new Map());
	const activeSessionRef = useRef<string | null>(null);

	const [{ data: progressData }] = useSubscription({
		query: UPLOAD_PROGRESS_SUBSCRIPTION,
		variables: { sessionId: activeSessionRef.current ?? "" },
		pause: !activeSessionRef.current,
	});

	useEffect(() => {
		const progress = progressData?.uploadProgress;
		if (!progress) return;

		const ppId = sessionToPpId.current.get(progress.sessionId);
		if (!ppId) return;

		const totalChunks = Math.max(progress.totalChunks, 1);
		const totalSize = Math.max(progress.totalSize, 1);
		const pct =
			progress.status === "completed"
				? 100
				: progress.phase === "client_to_server"
					? Math.round((progress.receivedChunks / totalChunks) * 50)
					: Math.round(
							50 + (progress.providerBytesTransferred / totalSize) * 50,
						);

		const isTerminal =
			progress.status === "completed" ||
			progress.status === "failed" ||
			progress.status === "cancelled";

		if (progress.status === "completed") {
			progressPanel.done(ppId, "Uploaded");
		} else if (progress.status === "failed") {
			progressPanel.error(ppId, progress.errorMessage ?? "Upload failed");
		} else if (progress.status === "cancelled") {
			progressPanel.error(ppId, "Cancelled");
		} else {
			// Phase label + colour
			const isServerToProvider = progress.phase === "server_to_provider";
			progressPanel.update(ppId, {
				phase: isServerToProvider ? "blue" : "green",
				progress: Math.max(0, Math.min(100, pct)),
				phaseLabel: isServerToProvider
					? "Uploading to provider…"
					: `Uploading… ${Math.round(pct)}%`,
			});
		}

		if (isTerminal) {
			sessionToPpId.current.delete(progress.sessionId);
			if (activeSessionRef.current === progress.sessionId) {
				activeSessionRef.current = null;
			}
		}
	}, [progressData]);

	const uploadS3Direct = useCallback(
		async (
			file: File,
			sessionId: string,
			totalChunks: number,
			chunkSize: number,
			presignedPartUrls: ReadonlyArray<{ partNumber: number; url: string }>,
			ppId: string,
		): Promise<boolean> => {
			const parts: Array<{ partNumber: number; etag: string }> = [];

			for (let i = 0; i < totalChunks; i++) {
				const start = i * chunkSize;
				const end = Math.min(start + chunkSize, file.size);
				const chunk = file.slice(start, end);
				const partUrl = presignedPartUrls[i];
				if (!partUrl)
					throw new Error(`Missing presigned URL for part ${i + 1}`);

				let lastError: Error | undefined;
				let etag: string | undefined;

				for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
					try {
						const response = await fetch(partUrl.url, {
							method: "PUT",
							body: chunk,
						});
						if (!response.ok)
							throw new Error(`S3 part upload failed: ${response.status}`);
						etag = response.headers.get("etag") ?? undefined;
						if (!etag) throw new Error("S3 did not return ETag for part");
						lastError = undefined;
						break;
					} catch (error) {
						lastError =
							error instanceof Error ? error : new Error(String(error));
						if (attempt < MAX_RETRIES - 1) {
							await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
						}
					}
				}

				if (lastError) throw lastError;
				parts.push({ partNumber: partUrl.partNumber, etag: etag as string });

				const pct = Math.round(((i + 1) / totalChunks) * 100);
				progressPanel.update(ppId, {
					phase: "green",
					progress: pct,
					phaseLabel: `Uploading… ${pct}%`,
				});
			}

			const completeResult = await completeS3Multipart({ sessionId, parts });
			if (completeResult.error) {
				throw new Error(
					completeResult.error.message ?? "Failed to complete S3 upload",
				);
			}

			progressPanel.done(ppId, "Uploaded");
			return true;
		},
		[completeS3Multipart],
	);

	const uploadProxyChunks = useCallback(
		async (
			file: File,
			sessionId: string,
			totalChunks: number,
			chunkSize: number,
			ppId: string,
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
							progressPanel.update(ppId, {
								phase: "blue",
								progress: 50,
								phaseLabel: "Uploading to provider…",
							});
						}

						lastError = undefined;
						break;
					} catch (error) {
						lastError =
							error instanceof Error ? error : new Error(String(error));
						if (attempt < MAX_RETRIES - 1) {
							await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
						}
					}
				}

				if (lastError) throw lastError;

				const pct = Math.round(((i + 1) / totalChunks) * 50);
				progressPanel.update(ppId, {
					phase: "green",
					progress: pct,
					phaseLabel: `Uploading… ${pct}%`,
				});
			}

			progressPanel.update(ppId, {
				phase: "blue",
				progress: 50,
				phaseLabel: "Uploading to provider…",
			});

			return true;
		},
		[token],
	);

	const uploadChunked = useCallback(
		async (
			file: File,
			providerId: string,
			ppId: string,
			currentFolderId?: string,
		): Promise<boolean> => {
			try {
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
				sessionToPpId.current.set(sessionId, ppId);

				progressPanel.update(ppId, {
					phase: "green",
					progress: 0,
					phaseLabel: "Uploading…",
					canCancel: true,
					onCancel: () => cancelUploadSession({ sessionId }),
				});

				if (useDirectUpload && presignedPartUrls) {
					return await uploadS3Direct(
						file,
						sessionId,
						totalChunks,
						chunkSize,
						presignedPartUrls,
						ppId,
					);
				}

				return await uploadProxyChunks(
					file,
					sessionId,
					totalChunks,
					chunkSize,
					ppId,
				);
			} catch (error) {
				const message =
					error instanceof Error ? error.message : "Chunked upload failed";
				progressPanel.error(ppId, message);
				return false;
			}
		},
		[
			initiateChunkedUpload,
			uploadS3Direct,
			uploadProxyChunks,
			cancelUploadSession,
		],
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

	return { uploadChunked, cancelSession, retrySession };
}
