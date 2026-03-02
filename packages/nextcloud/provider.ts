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
import { ProviderError, toJsonSafeError } from "@drivebase/core";
import type { NextcloudConfig } from "./schema";
import { NextcloudConfigSchema } from "./schema";
import type { NextcloudAuth } from "./webdav-client";
import {
	chunkedUploadAbort,
	chunkedUploadAssemble,
	chunkedUploadInit,
	chunkedUploadPart,
	copyResource,
	deleteResource,
	getFile,
	getOcsUserInfo,
	getQuotaWebdav,
	mkcol,
	moveResource,
	propfind,
	propfindSingle,
	putFile,
} from "./webdav-client";

function joinPath(...parts: string[]): string {
	const segments = parts
		.join("/")
		.split("/")
		.filter((s) => s.length > 0);
	return `/${segments.join("/")}`;
}

function pathBasename(path: string): string {
	const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
	return parts[parts.length - 1] ?? "/";
}

function pathParent(path: string): string {
	const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
	if (parts.length <= 1) return "/";
	parts.pop();
	return `/${parts.join("/")}`;
}

/** Track total file size for each chunked upload session */
const uploadSessionSizes = new Map<
	string,
	{ totalSize: number; destPath: string }
>();

export class NextcloudProvider implements IStorageProvider {
	private config: NextcloudConfig | null = null;
	private auth: NextcloudAuth | null = null;

	supportsChunkedUpload = true;

	async initialize(config: ProviderConfig): Promise<void> {
		const parsed = NextcloudConfigSchema.safeParse(config);
		if (!parsed.success) {
			throw new ProviderError("nextcloud", "Invalid Nextcloud configuration", {
				errors: parsed.error.errors,
			});
		}

		this.config = parsed.data;

		// If no appPassword yet, provider is pending Login Flow
		if (!this.config.appPassword || !this.config.username) {
			return;
		}

		this.auth = {
			serverUrl: this.config.serverUrl,
			username: this.config.username,
			appPassword: this.config.appPassword,
		};
	}

	async testConnection(): Promise<boolean> {
		if (!this.auth) return false;

		try {
			// Try a PROPFIND on root
			await propfind(this.auth, "/", "0");
			return true;
		} catch {
			return false;
		}
	}

	async getQuota(): Promise<ProviderQuota> {
		const auth = this.ensureAuth();

		try {
			const { used, available } = await getQuotaWebdav(auth);
			const total = available !== undefined ? used + available : undefined;
			return { used, total, available };
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("nextcloud", "Failed to get quota", {
				op: "getQuota",
				error: toJsonSafeError(error),
			});
		}
	}

	async getAccountInfo(): Promise<{ email?: string; name?: string }> {
		const auth = this.ensureAuth();

		try {
			const info = await getOcsUserInfo(auth);
			return {
				email: info.email,
				name: info.displayname,
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("nextcloud", "Failed to get account info", {
				op: "getAccountInfo",
				error: toJsonSafeError(error),
			});
		}
	}

	async requestUpload(options: UploadOptions): Promise<UploadResponse> {
		this.ensureAuth();
		const parent = options.parentId ?? "/";
		const remotePath = joinPath(parent, options.name);

		return {
			fileId: remotePath,
			uploadUrl: undefined,
			uploadFields: undefined,
			useDirectUpload: false,
		};
	}

	async uploadFile(
		remoteId: string,
		data: ReadableStream | Buffer,
	): Promise<string | undefined> {
		const auth = this.ensureAuth();

		try {
			// Ensure parent directory exists
			const parent = pathParent(remoteId);
			if (parent !== "/") {
				await mkcol(auth, parent);
			}

			await putFile(auth, remoteId, data);
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("nextcloud", "Failed to upload file", {
				op: "uploadFile",
				remoteId,
				error: toJsonSafeError(error),
			});
		}

		return undefined;
	}

	async requestDownload(options: DownloadOptions): Promise<DownloadResponse> {
		return {
			fileId: options.remoteId,
			downloadUrl: undefined,
			useDirectDownload: false,
		};
	}

	async downloadFile(remoteId: string): Promise<ReadableStream> {
		const auth = this.ensureAuth();

		try {
			return await getFile(auth, remoteId);
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("nextcloud", "Failed to download file", {
				op: "downloadFile",
				remoteId,
				error: toJsonSafeError(error),
			});
		}
	}

	async createFolder(options: CreateFolderOptions): Promise<string> {
		const auth = this.ensureAuth();
		const parent = options.parentId ?? "/";
		const remotePath = joinPath(parent, options.name);

		try {
			await mkcol(auth, remotePath);
			return remotePath;
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("nextcloud", "Failed to create folder", {
				op: "createFolder",
				remotePath,
				error: toJsonSafeError(error),
			});
		}
	}

	async delete(options: DeleteOptions): Promise<void> {
		const auth = this.ensureAuth();

		try {
			await deleteResource(auth, options.remoteId);
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("nextcloud", "Failed to delete", {
				op: "delete",
				remoteId: options.remoteId,
				error: toJsonSafeError(error),
			});
		}
	}

	async move(options: MoveOptions): Promise<void> {
		const auth = this.ensureAuth();
		const name = options.newName ?? pathBasename(options.remoteId);
		const newParent = options.newParentId ?? pathParent(options.remoteId);
		const destination = joinPath(newParent, name);

		try {
			await moveResource(auth, options.remoteId, destination);
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("nextcloud", "Failed to move", {
				op: "move",
				from: options.remoteId,
				to: destination,
				error: toJsonSafeError(error),
			});
		}
	}

	async copy(options: CopyOptions): Promise<string> {
		const auth = this.ensureAuth();
		const name = options.newName ?? pathBasename(options.remoteId);
		const targetParent = options.targetParentId ?? pathParent(options.remoteId);
		const destination = joinPath(targetParent, name);

		try {
			await copyResource(auth, options.remoteId, destination);
			return destination;
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("nextcloud", "Failed to copy", {
				op: "copy",
				from: options.remoteId,
				to: destination,
				error: toJsonSafeError(error),
			});
		}
	}

	async list(options: ListOptions): Promise<ListResult> {
		const auth = this.ensureAuth();
		const remotePath = options.folderId ?? "/";

		try {
			const items = await propfind(auth, remotePath, "1");

			const files: FileMetadata[] = [];
			const folders: FolderMetadata[] = [];

			for (const item of items) {
				if (item.isDirectory) {
					folders.push({
						remoteId: item.remoteId,
						name: item.name,
						modifiedAt: item.lastModified,
					});
				} else {
					files.push({
						remoteId: item.remoteId,
						name: item.name,
						mimeType: item.mimeType,
						size: item.size,
						modifiedAt: item.lastModified,
					});
				}
			}

			return { files, folders };
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("nextcloud", "Failed to list directory", {
				op: "list",
				remotePath,
				error: toJsonSafeError(error),
			});
		}
	}

	async getFileMetadata(remoteId: string): Promise<FileMetadata> {
		const auth = this.ensureAuth();

		try {
			const item = await propfindSingle(auth, remoteId);

			if (item.isDirectory) {
				throw new ProviderError(
					"nextcloud",
					"Path is a directory, not a file",
					{ remoteId },
				);
			}

			return {
				remoteId: item.remoteId,
				name: item.name,
				mimeType: item.mimeType,
				size: item.size,
				modifiedAt: item.lastModified,
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("nextcloud", "Failed to get file metadata", {
				op: "getFileMetadata",
				remoteId,
				error: toJsonSafeError(error),
			});
		}
	}

	async getFolderMetadata(remoteId: string): Promise<FolderMetadata> {
		const auth = this.ensureAuth();

		if (!remoteId || remoteId === "/") {
			return { remoteId: "/", name: "/", modifiedAt: new Date() };
		}

		try {
			const item = await propfindSingle(auth, remoteId);

			return {
				remoteId: item.remoteId,
				name: item.name,
				modifiedAt: item.lastModified,
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("nextcloud", "Failed to get folder metadata", {
				op: "getFolderMetadata",
				remoteId,
				error: toJsonSafeError(error),
			});
		}
	}

	async findFolder(name: string, parentId?: string): Promise<string | null> {
		const auth = this.ensureAuth();
		const parentPath = parentId ?? "/";

		try {
			const items = await propfind(auth, parentPath, "1");
			const folder = items.find(
				(item) => item.isDirectory && item.name === name,
			);
			return folder?.remoteId ?? null;
		} catch {
			return null;
		}
	}

	// ── Chunked upload (Nextcloud v2) ──────────────────────────────

	async initiateMultipartUpload(
		options: UploadOptions,
	): Promise<MultipartUploadResult> {
		const auth = this.ensureAuth();

		const uploadId = crypto.randomUUID();
		const parent = options.parentId ?? "/";
		const destPath = joinPath(parent, options.name);

		try {
			await chunkedUploadInit(auth, uploadId);

			// Store session metadata for assembly
			uploadSessionSizes.set(uploadId, {
				totalSize: options.size,
				destPath,
			});

			return {
				uploadId,
				remoteId: destPath,
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError(
				"nextcloud",
				"Failed to initiate chunked upload",
				{
					op: "initiateMultipartUpload",
					uploadId,
					destPath,
					error: toJsonSafeError(error),
				},
			);
		}
	}

	async uploadPart(
		uploadId: string,
		remoteId: string,
		partNumber: number,
		data: Buffer,
	): Promise<UploadPartResult> {
		const auth = this.ensureAuth();

		const session = uploadSessionSizes.get(uploadId);
		if (!session) {
			throw new ProviderError("nextcloud", "Unknown upload session", {
				uploadId,
			});
		}

		try {
			await chunkedUploadPart(
				auth,
				uploadId,
				partNumber,
				data,
				session.totalSize,
				remoteId,
			);

			return {
				partNumber,
				etag: `part-${partNumber}`,
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError(
				"nextcloud",
				`Failed to upload chunk ${partNumber}`,
				{
					op: "uploadPart",
					uploadId,
					partNumber,
					error: toJsonSafeError(error),
				},
			);
		}
	}

	async completeMultipartUpload(
		uploadId: string,
		remoteId: string,
		_parts: UploadPartResult[],
	): Promise<void> {
		const auth = this.ensureAuth();

		const session = uploadSessionSizes.get(uploadId);
		if (!session) {
			throw new ProviderError("nextcloud", "Unknown upload session", {
				uploadId,
			});
		}

		try {
			await chunkedUploadAssemble(auth, uploadId, remoteId, session.totalSize);
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError(
				"nextcloud",
				"Failed to assemble chunked upload",
				{
					op: "completeMultipartUpload",
					uploadId,
					remoteId,
					error: toJsonSafeError(error),
				},
			);
		} finally {
			uploadSessionSizes.delete(uploadId);
		}
	}

	async abortMultipartUpload(
		uploadId: string,
		_remoteId: string,
	): Promise<void> {
		const auth = this.ensureAuth();

		try {
			await chunkedUploadAbort(auth, uploadId);
		} catch {
			// Best-effort abort
		} finally {
			uploadSessionSizes.delete(uploadId);
		}
	}

	async cleanup(): Promise<void> {
		this.config = null;
		this.auth = null;
	}

	private ensureAuth(): NextcloudAuth {
		if (!this.auth) {
			throw new ProviderError("nextcloud", "Provider not initialized");
		}
		return this.auth;
	}
}
