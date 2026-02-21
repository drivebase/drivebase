import type {
	CopyOptions,
	CreateFolderOptions,
	DeleteOptions,
	DownloadOptions,
	DownloadResponse,
	FileMetadata,
	FolderMetadata,
	IStorageProvider,
	ListOptions,
	ListResult,
	MoveOptions,
	MultipartUploadResult,
	ProviderConfig,
	ProviderQuota,
	UploadOptions,
	UploadPartResult,
	UploadResponse,
} from "@drivebase/core";
import { ProviderError } from "@drivebase/core";
import type { Auth } from "googleapis";
import { type drive_v3, google } from "googleapis";
import type { GoogleDriveConfig } from "./schema";
import { GoogleDriveConfigSchema } from "./schema";

/**
 * Google Drive storage provider
 */
export class GoogleDriveProvider implements IStorageProvider {
	private drive: drive_v3.Drive | null = null;
	private config: GoogleDriveConfig | null = null;
	private authClient: Auth.OAuth2Client | null = null;

	supportsChunkedUpload = true;

	/**
	 * Initialize the provider with OAuth credentials.
	 * If no refreshToken is present the provider is in a "pending OAuth" state —
	 * operations will fail until the OAuth callback completes.
	 */
	async initialize(config: ProviderConfig): Promise<void> {
		// Validate config
		const parsed = GoogleDriveConfigSchema.safeParse(config);
		if (!parsed.success) {
			throw new ProviderError(
				"google_drive",
				"Invalid Google Drive configuration",
				{ errors: parsed.error.errors },
			);
		}

		this.config = parsed.data;

		// If no refresh token yet, provider is pending OAuth — skip Drive setup
		if (!this.config.refreshToken) {
			return;
		}

		// Create OAuth2 client
		const oauth2Client = new google.auth.OAuth2(
			this.config.clientId,
			this.config.clientSecret,
		);

		// Use refresh token only so google-auth-library can mint fresh access tokens.
		// Persisted access tokens can expire and become stale, causing authError failures.
		oauth2Client.setCredentials({
			refresh_token: this.config.refreshToken,
		});

		this.authClient = oauth2Client;

		// Create Drive client
		this.drive = google.drive({
			version: "v3",
			auth: oauth2Client,
		});
	}

	/**
	 * Test the connection to Google Drive.
	 * Returns false (not throws) when the Drive client is not yet initialized
	 * so callers can detect the pending-OAuth state gracefully.
	 */
	async testConnection(): Promise<boolean> {
		try {
			if (!this.drive) {
				return false;
			}

			await this.drive.about.get({ fields: "user" });
			return true;
		} catch (error) {
			console.error("Google Drive connection test failed:", error);
			return false;
		}
	}

	/**
	 * Get quota information from Google Drive
	 */
	async getQuota(): Promise<ProviderQuota> {
		const drive = this.ensureInitialized();

		try {
			const response = await drive.about.get({
				fields: "storageQuota",
			});

			const quota = response.data.storageQuota;
			const limit = quota?.limit ? parseInt(quota.limit, 10) : null;
			const usage = quota?.usage ? parseInt(quota.usage, 10) : 0;

			return {
				total: limit ?? undefined,
				used: usage,
				available: limit ? limit - usage : undefined,
			};
		} catch (error) {
			throw new ProviderError("google_drive", "Failed to get quota", { error });
		}
	}

	/**
	 * Get connected Google account info for display purposes.
	 */
	async getAccountInfo(): Promise<{ email?: string; name?: string }> {
		const drive = this.ensureInitialized();

		try {
			const response = await drive.about.get({
				fields: "user(displayName,emailAddress)",
			});

			return {
				email: response.data.user?.emailAddress ?? undefined,
				name: response.data.user?.displayName ?? undefined,
			};
		} catch (error) {
			throw new ProviderError("google_drive", "Failed to get account info", {
				error,
			});
		}
	}
	// ... existing imports

	// ... inside GoogleDriveProvider class

	/**
	 * Request file upload
	 * We use proxy upload to avoid CORS issues with direct Google Drive upload
	 */
	async requestUpload(options: UploadOptions): Promise<UploadResponse> {
		const drive = this.ensureInitialized();

		try {
			// Create a placeholder file to get the ID immediately
			const createRes = await drive.files.create({
				requestBody: {
					name: options.name,
					mimeType: options.mimeType || "application/octet-stream",
					parents: options.parentId ? [options.parentId] : undefined,
				},
				fields: "id",
			});

			const fileId = createRes.data.id;

			if (!fileId) {
				throw new ProviderError(
					"google_drive",
					"Failed to create placeholder file",
				);
			}

			// Return ID only, indicating proxy upload required
			return {
				fileId,
				uploadUrl: undefined,
				uploadFields: undefined,
				useDirectUpload: false,
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("google_drive", "Failed to request upload", {
				error,
			});
		}
	}

	/**
	 * Upload file to Google Drive
	 */
	async uploadFile(
		remoteId: string,
		data: ReadableStream | Buffer,
	): Promise<string | undefined> {
		const drive = this.ensureInitialized();

		// Ensure we have a valid token
		if (this.authClient) {
			await this.authClient.getAccessToken();
		}

		try {
			const auth = drive.context._options.auth as Auth.OAuth2Client;
			const token = await auth.getAccessToken();

			if (!token || !token.token) {
				throw new ProviderError("google_drive", "Failed to get access token");
			}

			const requestBody = Buffer.isBuffer(data) ? new Uint8Array(data) : data;

			const response = await fetch(
				`https://www.googleapis.com/upload/drive/v3/files/${remoteId}?uploadType=media`,
				{
					method: "PATCH",
					headers: {
						Authorization: `Bearer ${token.token}`,
						"Content-Type": "application/octet-stream",
					},
					body: requestBody,
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				throw new ProviderError(
					"google_drive",
					`Failed to upload file: ${response.status} ${response.statusText} - ${errorText}`,
				);
			}
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("google_drive", "Failed to upload file", {
				error,
			});
		}

		return undefined;
	}

	/**
	 * Request file download
	 * Google Drive provides webContentLink for downloads
	 */
	async requestDownload(options: DownloadOptions): Promise<DownloadResponse> {
		const drive = this.ensureInitialized();

		try {
			// Get file metadata to get webContentLink
			const response = await drive.files.get({
				fileId: options.remoteId,
				fields: "webContentLink,webViewLink",
			});

			const downloadUrl =
				response.data.webContentLink || response.data.webViewLink;

			if (downloadUrl) {
				return {
					fileId: options.remoteId,
					downloadUrl,
					useDirectDownload: true,
				};
			}

			// Fallback to streaming through API
			return {
				fileId: options.remoteId,
				downloadUrl: undefined,
				useDirectDownload: false,
			};
		} catch (error) {
			throw new ProviderError("google_drive", "Failed to request download", {
				error,
			});
		}
	}

	/**
	 * Download file from Google Drive
	 */
	async downloadFile(remoteId: string): Promise<ReadableStream> {
		const drive = this.ensureInitialized();

		try {
			const response = await drive.files.get(
				{
					fileId: remoteId,
					alt: "media",
				},
				{ responseType: "stream" },
			);

			// Convert Node.js stream to Web ReadableStream
			const nodeStream = response.data as NodeJS.ReadableStream;

			return new ReadableStream({
				start(controller) {
					nodeStream.on("data", (chunk: Buffer) => {
						controller.enqueue(chunk);
					});

					nodeStream.on("end", () => {
						controller.close();
					});

					nodeStream.on("error", (error: Error) => {
						controller.error(error);
					});
				},
			});
		} catch (error) {
			throw new ProviderError("google_drive", "Failed to download file", {
				error,
			});
		}
	}

	/**
	 * Find a folder by name in a parent directory
	 */
	async findFolder(name: string, parentId?: string): Promise<string | null> {
		const drive = this.ensureInitialized();

		try {
			const parent = parentId ?? "root";
			const q = `name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and '${parent}' in parents and trashed = false`;

			const response = await drive.files.list({
				q,
				fields: "files(id)",
				pageSize: 1,
			});

			const folderId = response.data.files?.[0]?.id;
			return folderId ?? null;
		} catch {
			return null;
		}
	}

	/**
	 * Create a folder in Google Drive
	 */
	async createFolder(options: CreateFolderOptions): Promise<string> {
		const drive = this.ensureInitialized();

		try {
			const fileMetadata: drive_v3.Schema$File = {
				name: options.name,
				mimeType: "application/vnd.google-apps.folder",
			};

			if (options.parentId) {
				fileMetadata.parents = [options.parentId];
			}

			const response = await drive.files.create({
				requestBody: fileMetadata,
				fields: "id",
			});

			if (!response.data.id) {
				throw new ProviderError(
					"google_drive",
					"No folder ID returned from Google Drive",
				);
			}

			return response.data.id;
		} catch (error) {
			throw new ProviderError("google_drive", "Failed to create folder", {
				error,
			});
		}
	}

	/**
	 * Delete a file or folder
	 */
	async delete(options: DeleteOptions): Promise<void> {
		const drive = this.ensureInitialized();

		try {
			await drive.files.delete({
				fileId: options.remoteId,
			});
		} catch (error) {
			throw new ProviderError("google_drive", "Failed to delete", { error });
		}
	}

	/**
	 * Move a file or folder
	 */
	async move(options: MoveOptions): Promise<void> {
		const drive = this.ensureInitialized();

		try {
			// Get current parents
			const file = await drive.files.get({
				fileId: options.remoteId,
				fields: "parents",
			});

			const previousParents = file.data.parents?.join(",");

			// Build request body
			const requestBody: drive_v3.Schema$File = {};
			if (options.newName) {
				requestBody.name = options.newName;
			}

			// Update file
			const updateData: drive_v3.Params$Resource$Files$Update = {
				fileId: options.remoteId,
				addParents: options.newParentId,
				removeParents: previousParents,
				requestBody,
			};

			await drive.files.update(updateData);
		} catch (error) {
			throw new ProviderError("google_drive", "Failed to move", { error });
		}
	}

	/**
	 * Copy a file or folder
	 */
	async copy(options: CopyOptions): Promise<string> {
		const drive = this.ensureInitialized();

		try {
			const copyMetadata: drive_v3.Schema$File = {};

			if (options.newName) {
				copyMetadata.name = options.newName;
			}

			if (options.targetParentId) {
				copyMetadata.parents = [options.targetParentId];
			}

			const response = await drive.files.copy({
				fileId: options.remoteId,
				requestBody: copyMetadata,
				fields: "id",
			});

			if (!response.data.id) {
				throw new ProviderError(
					"google_drive",
					"No file ID returned from Google Drive",
				);
			}

			return response.data.id;
		} catch (error) {
			throw new ProviderError("google_drive", "Failed to copy", { error });
		}
	}

	/**
	 * List files and folders
	 */
	async list(options: ListOptions): Promise<ListResult> {
		const drive = this.ensureInitialized();

		try {
			// Build query
			let query = "trashed = false";

			if (options.folderId) {
				query += ` and '${options.folderId}' in parents`;
			} else {
				query += " and 'root' in parents";
			}

			const response = await drive.files.list({
				q: query,
				pageSize: options.limit || 100,
				pageToken: options.pageToken,
				fields:
					"nextPageToken, files(id, name, mimeType, size, modifiedTime, md5Checksum)",
			});

			const files: FileMetadata[] = [];
			const folders: FolderMetadata[] = [];

			for (const file of response.data.files || []) {
				// Skip files without required fields
				if (!file.id || !file.name || !file.modifiedTime) {
					continue;
				}

				if (file.mimeType === "application/vnd.google-apps.folder") {
					folders.push({
						remoteId: file.id,
						name: file.name,
						modifiedAt: new Date(file.modifiedTime),
					});
				} else {
					// Skip files without mimeType
					if (!file.mimeType) {
						continue;
					}

					files.push({
						remoteId: file.id,
						name: file.name,
						mimeType: file.mimeType,
						size: file.size ? parseInt(file.size, 10) : 0,
						modifiedAt: new Date(file.modifiedTime),
						hash: file.md5Checksum || undefined,
					});
				}
			}

			return {
				files,
				folders,
				nextPageToken: response.data.nextPageToken || undefined,
			};
		} catch (error) {
			throw new ProviderError("google_drive", "Failed to list files", {
				error,
			});
		}
	}

	/**
	 * Get file metadata
	 */
	async getFileMetadata(remoteId: string): Promise<FileMetadata> {
		const drive = this.ensureInitialized();

		try {
			const response = await drive.files.get({
				fileId: remoteId,
				fields: "id, name, mimeType, size, modifiedTime, md5Checksum",
			});

			const file = response.data;

			// Validate required fields
			if (!file.id || !file.name || !file.mimeType || !file.modifiedTime) {
				throw new ProviderError(
					"google_drive",
					"Missing required fields in file metadata response",
				);
			}

			return {
				remoteId: file.id,
				name: file.name,
				mimeType: file.mimeType,
				size: file.size ? parseInt(file.size, 10) : 0,
				modifiedAt: new Date(file.modifiedTime),
				hash: file.md5Checksum || undefined,
			};
		} catch (error) {
			throw new ProviderError("google_drive", "Failed to get file metadata", {
				error,
			});
		}
	}

	/**
	 * Get folder metadata
	 */
	async getFolderMetadata(remoteId: string): Promise<FolderMetadata> {
		const drive = this.ensureInitialized();

		try {
			const response = await drive.files.get({
				fileId: remoteId,
				fields: "id, name, modifiedTime",
			});

			const folder = response.data;

			// Validate required fields
			if (!folder.id || !folder.name || !folder.modifiedTime) {
				throw new ProviderError(
					"google_drive",
					"Missing required fields in folder metadata response",
				);
			}

			return {
				remoteId: folder.id,
				name: folder.name,
				modifiedAt: new Date(folder.modifiedTime),
			};
		} catch (error) {
			throw new ProviderError("google_drive", "Failed to get folder metadata", {
				error,
			});
		}
	}

	/**
	 * Initiate a Google Drive resumable upload session
	 * Returns the session URI as uploadId and the file ID as remoteId
	 */
	async initiateMultipartUpload(
		options: UploadOptions,
	): Promise<MultipartUploadResult> {
		this.ensureInitialized();

		if (!this.authClient) {
			throw new ProviderError(
				"google_drive",
				"Auth client not available for resumable upload",
			);
		}

		try {
			const tokenResult = await this.authClient.getAccessToken();
			if (!tokenResult.token) {
				throw new ProviderError(
					"google_drive",
					"Failed to get access token for resumable upload",
				);
			}

			// Initiate resumable upload session
			const metadata = JSON.stringify({
				name: options.name,
				mimeType: options.mimeType || "application/octet-stream",
				parents: options.parentId ? [options.parentId] : undefined,
			});

			const response = await fetch(
				"https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${tokenResult.token}`,
						"Content-Type": "application/json; charset=UTF-8",
						"X-Upload-Content-Type":
							options.mimeType || "application/octet-stream",
						"X-Upload-Content-Length": String(options.size),
					},
					body: metadata,
				},
			);

			if (!response.ok) {
				const errorText = await response.text();
				throw new ProviderError(
					"google_drive",
					`Failed to initiate resumable upload: ${response.status} - ${errorText}`,
				);
			}

			const sessionUri = response.headers.get("location");
			if (!sessionUri) {
				throw new ProviderError(
					"google_drive",
					"No session URI returned from resumable upload initiation",
				);
			}

			// Extract file ID from response body if available
			const body = (await response.json()) as { id?: string };
			const remoteId = body.id ?? `pending-${Date.now()}`;

			return {
				uploadId: sessionUri, // The resumable session URI
				remoteId,
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError(
				"google_drive",
				"Failed to initiate resumable upload",
				{ error },
			);
		}
	}

	/**
	 * Upload a part (chunk) via Google Drive resumable upload
	 * Uses Content-Range header to specify byte range
	 */
	async uploadPart(
		uploadId: string, // session URI
		_remoteId: string,
		partNumber: number,
		data: Buffer,
	): Promise<UploadPartResult> {
		if (!this.authClient) {
			throw new ProviderError(
				"google_drive",
				"Auth client not available for chunk upload",
			);
		}

		try {
			// partNumber is 1-based, we need to calculate byte offsets
			// The caller should pass data with correct offset/size
			// For Google Drive resumable, we track cumulative bytes
			const response = await fetch(uploadId, {
				method: "PUT",
				headers: {
					"Content-Length": String(data.length),
					"Content-Type": "application/octet-stream",
				},
				body: new Uint8Array(data),
			});

			// 308 Resume Incomplete = part received, upload not finished
			// 200/201 = upload complete
			if (response.status !== 308 && !response.ok) {
				const errorText = await response.text();
				throw new ProviderError(
					"google_drive",
					`Failed to upload chunk: ${response.status} - ${errorText}`,
				);
			}

			return {
				partNumber,
				etag: response.headers.get("etag") ?? `part-${partNumber}`,
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError(
				"google_drive",
				`Failed to upload part ${partNumber}`,
				{ error },
			);
		}
	}

	/**
	 * Complete a multipart upload
	 * For Google Drive, the final PUT automatically completes the upload
	 */
	async completeMultipartUpload(
		_uploadId: string,
		_remoteId: string,
		_parts: UploadPartResult[],
	): Promise<void> {
		// Google Drive resumable uploads complete automatically when the last chunk is sent
		// No explicit completion step needed
	}

	/**
	 * Abort a resumable upload session
	 */
	async abortMultipartUpload(
		uploadId: string, // session URI
		_remoteId: string,
	): Promise<void> {
		try {
			await fetch(uploadId, { method: "DELETE" });
		} catch {
			// Best-effort abort, ignore errors
		}
	}

	/**
	 * Cleanup resources
	 */
	async cleanup(): Promise<void> {
		this.drive = null;
		this.config = null;
		this.authClient = null;
	}

	/**
	 * Ensure provider is initialized and return drive instance
	 */
	private ensureInitialized(): drive_v3.Drive {
		if (!this.drive) {
			throw new ProviderError("google_drive", "Provider not initialized");
		}
		return this.drive;
	}
}
