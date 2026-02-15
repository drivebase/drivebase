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
	ProviderConfig,
	ProviderQuota,
	UploadOptions,
	UploadResponse,
} from "@drivebase/core";
import { ProviderError } from "@drivebase/core";
import { refreshDropboxToken } from "./oauth";
import type { DropboxConfig } from "./schema";
import { DropboxConfigSchema } from "./schema";

const API_BASE = "https://api.dropboxapi.com/2";
const CONTENT_BASE = "https://content.dropboxapi.com/2";

interface DropboxFileEntry {
	".tag": "file" | "folder" | "deleted";
	id: string;
	name: string;
	path_lower: string;
	size?: number;
	client_modified?: string;
	server_modified?: string;
	content_hash?: string;
}

interface DropboxListFolderResult {
	entries: DropboxFileEntry[];
	cursor: string;
	has_more: boolean;
}

interface DropboxMetadataResult {
	".tag": "file" | "folder";
	id: string;
	name: string;
	path_lower: string;
	size?: number;
	client_modified?: string;
	server_modified?: string;
	content_hash?: string;
}

interface DropboxSpaceUsage {
	used: number;
	allocation: {
		".tag": "individual" | "team";
		allocated?: number;
		used?: number;
	};
}

interface DropboxAccount {
	email: string;
	name: {
		display_name: string;
	};
}

/**
 * Dropbox storage provider.
 * Uses Dropbox API v2 via raw fetch. File/folder remoteIds are Dropbox path_lower strings.
 */
export class DropboxProvider implements IStorageProvider {
	private config: DropboxConfig | null = null;
	private accessToken: string | null = null;

	/**
	 * Initialize with Dropbox OAuth credentials.
	 * If no refreshToken is present, the provider is in pending-OAuth state.
	 */
	async initialize(config: ProviderConfig): Promise<void> {
		const parsed = DropboxConfigSchema.safeParse(config);
		if (!parsed.success) {
			throw new ProviderError("dropbox", "Invalid Dropbox configuration", {
				errors: parsed.error.errors,
			});
		}

		this.config = parsed.data;

		if (!this.config.refreshToken) {
			return;
		}

		this.accessToken = this.config.accessToken ?? null;
	}

	/**
	 * Test the connection by fetching current account info.
	 * Returns false (not throws) when not yet initialized (pending OAuth).
	 */
	async testConnection(): Promise<boolean> {
		try {
			if (!this.config?.refreshToken) {
				return false;
			}

			await this.callApi("/users/get_current_account", null);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Get quota information
	 */
	async getQuota(): Promise<ProviderQuota> {
		const usage = await this.callApi<DropboxSpaceUsage>(
			"/users/get_space_usage",
			null,
		);

		const allocated = usage.allocation.allocated ?? null;

		return {
			used: usage.used,
			total: allocated ?? undefined,
			available: allocated ? allocated - usage.used : undefined,
		};
	}

	/**
	 * Get connected Dropbox account info for display purposes.
	 */
	async getAccountInfo(): Promise<{ email?: string; name?: string }> {
		const account = await this.callApi<DropboxAccount>(
			"/users/get_current_account",
			null,
		);

		return {
			email: account.email,
			name: account.name.display_name,
		};
	}

	/**
	 * Request file upload.
	 * Dropbox does not support client-side presigned upload URLs,
	 * so we use proxy upload. The fileId returned is the destination path.
	 */
	async requestUpload(options: UploadOptions): Promise<UploadResponse> {
		const parentPath = options.parentId ?? "";
		const fileId = `${parentPath}/${options.name}`;

		return {
			fileId,
			uploadUrl: undefined,
			uploadFields: undefined,
			useDirectUpload: false,
		};
	}

	/**
	 * Upload a file to Dropbox at the path specified by remoteId.
	 * Uses the simple upload endpoint (supports files up to 150 MB).
	 */
	async uploadFile(
		remoteId: string,
		data: ReadableStream | Buffer,
	): Promise<string | undefined> {
		const token = await this.ensureAccessToken();

		const arg = JSON.stringify({
			path: remoteId,
			mode: "overwrite",
			autorename: false,
		});

		const buf = Buffer.isBuffer(data) ? data : await streamToBuffer(data);
		const body = new Uint8Array(buf);

		const response = await fetch(`${CONTENT_BASE}/files/upload`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/octet-stream",
				"Dropbox-API-Arg": arg,
			},
			body,
		});

		if (!response.ok) {
			const text = await response.text();
			throw new ProviderError(
				"dropbox",
				`Failed to upload file: ${response.status} ${text}`,
			);
		}

		return undefined;
	}

	/**
	 * Request file download.
	 * Uses get_temporary_link to obtain a short-lived direct download URL.
	 */
	async requestDownload(options: DownloadOptions): Promise<DownloadResponse> {
		try {
			const result = await this.callApi<{ link: string }>(
				"/files/get_temporary_link",
				{ path: options.remoteId },
			);

			return {
				fileId: options.remoteId,
				downloadUrl: result.link,
				useDirectDownload: true,
			};
		} catch {
			return {
				fileId: options.remoteId,
				downloadUrl: undefined,
				useDirectDownload: false,
			};
		}
	}

	/**
	 * Download a file from Dropbox as a ReadableStream.
	 */
	async downloadFile(remoteId: string): Promise<ReadableStream> {
		const token = await this.ensureAccessToken();

		const arg = JSON.stringify({ path: remoteId });

		const response = await fetch(`${CONTENT_BASE}/files/download`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Dropbox-API-Arg": arg,
			},
		});

		if (!response.ok) {
			const text = await response.text();
			throw new ProviderError(
				"dropbox",
				`Failed to download file: ${response.status} ${text}`,
			);
		}

		if (!response.body) {
			throw new ProviderError("dropbox", "No response body for file download");
		}

		return response.body as unknown as ReadableStream;
	}

	/**
	 * Create a folder in Dropbox
	 */
	async createFolder(options: CreateFolderOptions): Promise<string> {
		const parentPath = options.parentId ?? "";
		const path = `${parentPath}/${options.name}`;

		const result = await this.callApi<{ metadata: { path_lower: string } }>(
			"/files/create_folder_v2",
			{ path, autorename: false },
		);

		if (!result.metadata.path_lower) {
			throw new ProviderError(
				"dropbox",
				"No path returned from create_folder_v2",
			);
		}

		return result.metadata.path_lower;
	}

	/**
	 * Delete a file or folder
	 */
	async delete(options: DeleteOptions): Promise<void> {
		await this.callApi("/files/delete_v2", { path: options.remoteId });
	}

	/**
	 * Move a file or folder
	 */
	async move(options: MoveOptions): Promise<void> {
		const currentPath = options.remoteId;
		const filename = options.newName ?? currentPath.split("/").pop() ?? "";
		const newParent = options.newParentId ?? "";
		const toPath = `${newParent}/${filename}`;

		await this.callApi("/files/move_v2", {
			from_path: currentPath,
			to_path: toPath,
			autorename: false,
		});
	}

	/**
	 * Copy a file or folder
	 */
	async copy(options: CopyOptions): Promise<string> {
		const sourcePath = options.remoteId;
		const filename = options.newName ?? sourcePath.split("/").pop() ?? "";
		const targetParent = options.targetParentId ?? "";
		const toPath = `${targetParent}/${filename}`;

		const result = await this.callApi<{ metadata: { path_lower: string } }>(
			"/files/copy_v2",
			{
				from_path: sourcePath,
				to_path: toPath,
				autorename: false,
			},
		);

		if (!result.metadata.path_lower) {
			throw new ProviderError("dropbox", "No path returned from copy_v2");
		}

		return result.metadata.path_lower;
	}

	/**
	 * List files and folders at a path
	 */
	async list(options: ListOptions): Promise<ListResult> {
		const path = options.folderId ?? "";

		const files: FileMetadata[] = [];
		const folders: FolderMetadata[] = [];

		let response: DropboxListFolderResult;

		if (options.pageToken) {
			response = await this.callApi<DropboxListFolderResult>(
				"/files/list_folder/continue",
				{ cursor: options.pageToken },
			);
		} else {
			response = await this.callApi<DropboxListFolderResult>(
				"/files/list_folder",
				{
					path,
					recursive: false,
					include_deleted: false,
					include_has_explicit_shared_members: false,
					limit: options.limit ?? 1000,
				},
			);
		}

		for (const entry of response.entries) {
			if (entry[".tag"] === "deleted") continue;
			if (!entry.path_lower) continue;

			if (entry[".tag"] === "folder") {
				folders.push({
					remoteId: entry.path_lower,
					name: entry.name,
					modifiedAt: new Date(),
				});
			} else if (entry[".tag"] === "file") {
				const modifiedAt = entry.server_modified
					? new Date(entry.server_modified)
					: new Date();

				files.push({
					remoteId: entry.path_lower,
					name: entry.name,
					mimeType: guessMimeType(entry.name),
					size: entry.size ?? 0,
					modifiedAt,
					hash: entry.content_hash ?? undefined,
				});
			}
		}

		return {
			files,
			folders,
			nextPageToken: response.has_more ? response.cursor : undefined,
		};
	}

	/**
	 * Get file metadata
	 */
	async getFileMetadata(remoteId: string): Promise<FileMetadata> {
		const meta = await this.callApi<DropboxMetadataResult>(
			"/files/get_metadata",
			{ path: remoteId },
		);

		if (meta[".tag"] !== "file") {
			throw new ProviderError(
				"dropbox",
				`Expected a file but got ${meta[".tag"]}`,
			);
		}

		const modifiedAt = meta.server_modified
			? new Date(meta.server_modified)
			: new Date();

		return {
			remoteId: meta.path_lower,
			name: meta.name,
			mimeType: guessMimeType(meta.name),
			size: meta.size ?? 0,
			modifiedAt,
			hash: meta.content_hash ?? undefined,
		};
	}

	/**
	 * Get folder metadata
	 */
	async getFolderMetadata(remoteId: string): Promise<FolderMetadata> {
		const meta = await this.callApi<DropboxMetadataResult>(
			"/files/get_metadata",
			{ path: remoteId },
		);

		if (meta[".tag"] !== "folder") {
			throw new ProviderError(
				"dropbox",
				`Expected a folder but got ${meta[".tag"]}`,
			);
		}

		return {
			remoteId: meta.path_lower,
			name: meta.name,
			modifiedAt: new Date(),
		};
	}

	/**
	 * Cleanup resources
	 */
	async cleanup(): Promise<void> {
		this.config = null;
		this.accessToken = null;
	}

	/**
	 * Ensure a valid access token, refreshing if necessary.
	 */
	private async ensureAccessToken(): Promise<string> {
		const config = this.config;
		if (!config) {
			throw new ProviderError("dropbox", "Provider not initialized");
		}
		if (!config.refreshToken) {
			throw new ProviderError(
				"dropbox",
				"Provider not authenticated — OAuth flow not completed",
			);
		}

		if (!this.accessToken) {
			this.accessToken = await refreshDropboxToken(
				config.appKey,
				config.appSecret,
				config.refreshToken,
			);
		}

		return this.accessToken;
	}

	/**
	 * Make an authenticated call to the Dropbox API.
	 * Automatically refreshes the access token on 401.
	 */
	private async callApi<T>(endpoint: string, body: unknown): Promise<T> {
		const token = await this.ensureAccessToken();

		const doRequest = async (accessToken: string): Promise<Response> => {
			return fetch(`${API_BASE}${endpoint}`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: body === null ? undefined : JSON.stringify(body),
			});
		};

		let response = await doRequest(token);

		if (response.status === 401) {
			const config = this.config;
			if (!config?.refreshToken) {
				throw new ProviderError("dropbox", "Authentication failed");
			}
			this.accessToken = await refreshDropboxToken(
				config.appKey,
				config.appSecret,
				config.refreshToken,
			);
			response = await doRequest(this.accessToken);
		}

		if (!response.ok) {
			const text = await response.text();
			throw new ProviderError(
				"dropbox",
				`Dropbox API error on ${endpoint}: ${response.status} ${text}`,
			);
		}

		return response.json() as Promise<T>;
	}
}

/**
 * Consume a ReadableStream into a Buffer.
 */
async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}

	return Buffer.concat(chunks);
}

/**
 * Best-effort MIME type from file extension.
 * Dropbox API does not return MIME types; this covers common cases.
 */
function guessMimeType(filename: string): string {
	const ext = filename.split(".").pop()?.toLowerCase() ?? "";

	const mimeTypes: Record<string, string> = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",
		svg: "image/svg+xml",
		pdf: "application/pdf",
		txt: "text/plain",
		md: "text/markdown",
		html: "text/html",
		css: "text/css",
		js: "text/javascript",
		ts: "text/typescript",
		json: "application/json",
		xml: "application/xml",
		zip: "application/zip",
		tar: "application/x-tar",
		gz: "application/gzip",
		mp4: "video/mp4",
		mov: "video/quicktime",
		avi: "video/x-msvideo",
		mp3: "audio/mpeg",
		wav: "audio/wav",
		ogg: "audio/ogg",
		doc: "application/msword",
		docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		xls: "application/vnd.ms-excel",
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		ppt: "application/vnd.ms-powerpoint",
		pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	};

	return mimeTypes[ext] ?? "application/octet-stream";
}
