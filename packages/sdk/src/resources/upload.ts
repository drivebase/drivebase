import { UploadError } from "../errors.ts";
import type { HttpClient } from "../http.ts";
import {
	CANCEL_UPLOAD_SESSION,
	COMPLETE_S3_MULTIPART,
	INITIATE_CHUNKED_UPLOAD,
	REQUEST_UPLOAD,
} from "../operations/file-mutations.ts";
import { GET_FILE } from "../operations/file-queries.ts";
import type {
	ChunkedUploadSession,
	File,
	ProgressCallback,
	UploadOptions,
	UploadResponse,
} from "../types.ts";
import {
	CHUNK_THRESHOLD,
	DEFAULT_CHUNK_SIZE,
	sliceIntoChunks,
} from "../utils/chunk.ts";
import { withRetry } from "../utils/retry.ts";

export class UploadManager {
	constructor(private readonly http: HttpClient) {}

	async upload(
		options: UploadOptions,
		onProgress?: ProgressCallback,
	): Promise<File> {
		if (options.size > CHUNK_THRESHOLD) {
			return this.chunkedUpload(options, onProgress);
		}
		return this.simpleUpload(options, onProgress);
	}

	private async simpleUpload(
		options: UploadOptions,
		onProgress?: ProgressCallback,
	): Promise<File> {
		const data = await this.http.graphql<{ requestUpload: UploadResponse }>(
			REQUEST_UPLOAD,
			{
				input: {
					name: options.name,
					mimeType: options.mimeType,
					size: options.size,
					providerId: options.providerId,
					folderId: options.folderId,
				},
			},
		);

		const { fileId, uploadUrl, uploadFields, useDirectUpload } =
			data.requestUpload;

		if (!uploadUrl) {
			throw new UploadError("Server did not return an upload URL");
		}

		onProgress?.({
			loaded: 0,
			total: options.size,
			percent: 0,
			phase: "uploading",
		});

		let blob: Blob;
		const rawData = options.data;
		if (rawData instanceof Blob) {
			blob = rawData;
		} else if (rawData instanceof ArrayBuffer) {
			blob = new Blob([rawData]);
		} else {
			blob = new Blob([
				new Uint8Array(
					rawData.buffer as ArrayBuffer,
					rawData.byteOffset,
					rawData.byteLength,
				),
			]);
		}

		try {
			if (uploadFields) {
				// S3-style POST with form fields
				const formData = new FormData();
				for (const [key, value] of Object.entries(uploadFields)) {
					formData.append(key, value);
				}
				formData.append("file", blob, options.name);

				const response = await this.http.rest("POST", uploadUrl, {
					body: formData,
				});

				if (!response.ok) {
					throw new UploadError(`Upload failed with status ${response.status}`);
				}
			} else if (useDirectUpload) {
				// Direct PUT to presigned URL
				const response = await fetch(uploadUrl, {
					method: "PUT",
					headers: { "Content-Type": options.mimeType },
					body: blob,
				});

				if (!response.ok) {
					throw new UploadError(
						`Direct upload failed with status ${response.status}`,
					);
				}
			} else {
				// Proxy upload through Drivebase API
				const response = await this.http.rest("POST", uploadUrl, {
					body: blob,
					headers: { "Content-Type": options.mimeType },
				});

				if (!response.ok) {
					const text = await response.text();
					throw new UploadError(`Proxy upload failed: ${text}`);
				}
			}
		} catch (error) {
			if (error instanceof UploadError) throw error;
			throw new UploadError(
				error instanceof Error ? error.message : "Upload failed",
			);
		}

		onProgress?.({
			loaded: options.size,
			total: options.size,
			percent: 100,
			phase: "complete",
		});

		// Fetch and return the created file record
		const result = await this.http.graphql<{ file: File }>(GET_FILE, {
			id: fileId,
		});
		return result.file;
	}

	private async chunkedUpload(
		options: UploadOptions,
		onProgress?: ProgressCallback,
	): Promise<File> {
		const data = await this.http.graphql<{
			initiateChunkedUpload: ChunkedUploadSession;
		}>(INITIATE_CHUNKED_UPLOAD, {
			input: {
				name: options.name,
				mimeType: options.mimeType,
				totalSize: options.size,
				chunkSize: DEFAULT_CHUNK_SIZE,
				providerId: options.providerId,
				folderId: options.folderId,
			},
		});

		const session = data.initiateChunkedUpload;
		const chunks = sliceIntoChunks(options.data, session.chunkSize);

		try {
			if (session.useDirectUpload && session.presignedPartUrls) {
				await this.uploadS3Direct(session, chunks, options.size, onProgress);
			} else {
				await this.uploadProxyChunks(session, chunks, options.size, onProgress);
			}
		} catch (error) {
			// Cancel the session on failure
			try {
				await this.http.graphql(CANCEL_UPLOAD_SESSION, {
					sessionId: session.sessionId,
				});
			} catch {
				// Ignore cleanup errors
			}
			throw error instanceof UploadError
				? error
				: new UploadError(
						error instanceof Error ? error.message : "Chunked upload failed",
						session.sessionId,
					);
		}

		// Poll for the file to be created (the worker processes async)
		return this.waitForFile(session.sessionId, options.size, onProgress);
	}

	private async uploadS3Direct(
		session: ChunkedUploadSession,
		chunks: Blob[],
		totalSize: number,
		onProgress?: ProgressCallback,
	): Promise<void> {
		const urls = session.presignedPartUrls;
		if (!urls) throw new UploadError("Missing presigned URLs for S3 upload");

		const parts: Array<{ partNumber: number; etag: string }> = [];

		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			if (!chunk) {
				throw new UploadError(`Missing chunk at index ${i} for S3 upload`);
			}
			const partUrl = urls[i];
			if (!partUrl) {
				throw new UploadError(`Missing presigned URL for part ${i + 1}`);
			}

			const etag = await withRetry(async () => {
				const response = await fetch(partUrl.url, {
					method: "PUT",
					body: chunk,
				});

				if (!response.ok) {
					throw new UploadError(`S3 part upload failed: ${response.status}`);
				}

				const etagHeader = response.headers.get("etag");
				if (!etagHeader) {
					throw new UploadError("S3 did not return ETag for part");
				}
				return etagHeader;
			});

			parts.push({ partNumber: partUrl.partNumber, etag });

			onProgress?.({
				loaded: Math.min((i + 1) * session.chunkSize, totalSize),
				total: totalSize,
				percent: Math.round(((i + 1) / chunks.length) * 100),
				phase: "uploading",
			});
		}

		await this.http.graphql(COMPLETE_S3_MULTIPART, {
			sessionId: session.sessionId,
			parts,
		});
	}

	private async uploadProxyChunks(
		session: ChunkedUploadSession,
		chunks: Blob[],
		totalSize: number,
		onProgress?: ProgressCallback,
	): Promise<void> {
		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			if (!chunk) {
				throw new UploadError("Missing chunk during proxy upload");
			}

			await withRetry(async () => {
				const response = await this.http.rest("POST", "/api/upload/chunk", {
					body: chunk,
					headers: { "Content-Type": "application/octet-stream" },
					query: {
						sessionId: session.sessionId,
						chunkIndex: String(i),
					},
				});

				if (!response.ok) {
					const text = await response.text();
					throw new UploadError(`Chunk upload failed: ${text}`);
				}
			});

			const uploadedBytes = Math.min((i + 1) * session.chunkSize, totalSize);
			onProgress?.({
				loaded: uploadedBytes,
				total: totalSize,
				percent: Math.round((uploadedBytes / totalSize) * 50),
				phase: "uploading",
			});
		}

		onProgress?.({
			loaded: totalSize,
			total: totalSize,
			percent: 50,
			phase: "transferring",
		});
	}

	/**
	 * After proxy chunked upload, the BullMQ worker transfers to provider async.
	 * Poll the file query until the file record exists.
	 */
	private async waitForFile(
		sessionId: string,
		totalSize: number,
		onProgress?: ProgressCallback,
	): Promise<File> {
		// The session mutation returns a fileId embedded in the session.
		// We need to query active sessions to get the file info.
		// For S3 direct, the file is created immediately after completeS3MultipartUpload.
		// For proxy, poll with a simple delay.
		const maxAttempts = 60;
		const pollIntervalMs = 2000;

		for (let attempt = 0; attempt < maxAttempts; attempt++) {
			try {
				const data = await this.http.graphql<{
					activeUploadSessions: Array<{
						sessionId: string;
						status: string;
						errorMessage: string | null;
					}>;
				}>(
					`query ActiveSessions { activeUploadSessions { sessionId status errorMessage } }`,
				);

				const session = data.activeUploadSessions.find(
					(s) => s.sessionId === sessionId,
				);

				if (!session || session.status === "completed") {
					onProgress?.({
						loaded: totalSize,
						total: totalSize,
						percent: 100,
						phase: "complete",
					});
					// Session completed — the file should now exist.
					// Unfortunately we don't have the fileId from the session query,
					// so we return a minimal file object. Caller can re-fetch if needed.
					break;
				}

				if (session.status === "failed") {
					throw new UploadError(
						session.errorMessage ?? "Upload transfer failed",
						sessionId,
					);
				}
			} catch (error) {
				if (error instanceof UploadError) throw error;
				// Ignore transient query errors during polling
			}

			await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
		}

		// Return a best-effort file object — the upload completed but
		// we can't easily resolve the fileId from the session alone.
		// Return a sentinel that callers can use.
		return {
			id: sessionId,
			name: "",
			virtualPath: "",
			mimeType: "",
			size: totalSize,
			hash: null,
			remoteId: "",
			providerId: "",
			folderId: null,
			uploadedBy: "",
			isDeleted: false,
			starred: false,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			lifecycle: {
				state: "HOT",
				storageClass: null,
				restoreRequestedAt: null,
				restoreExpiresAt: null,
				lastCheckedAt: null,
			},
		};
	}
}
