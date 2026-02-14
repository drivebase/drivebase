import { Readable } from "node:stream";
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
import {
	createClient,
	type DiskQuota,
	type FileStat,
	type ResponseDataDetailed,
	type WebDAVClient,
} from "webdav";
import { type WebDAVConfig, WebDAVConfigSchema } from "./schema";

function joinPath(base: string, ...parts: string[]): string {
	const segments = [base, ...parts]
		.join("/")
		.split("/")
		.filter((s) => s.length > 0);
	return `/${segments.join("/")}`;
}

function resolvePath(rootPath: string | undefined, remotePath: string): string {
	const root = rootPath ? rootPath.replace(/\/+$/, "") : "";
	if (!remotePath || remotePath === "/") return root || "/";
	const normalized = remotePath.startsWith("/") ? remotePath : `/${remotePath}`;
	return root ? `${root}${normalized}` : normalized;
}

function basename(path: string): string {
	const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
	return parts[parts.length - 1] ?? path;
}

function parentDir(path: string): string {
	const parts = path.replace(/\/+$/, "").split("/").filter(Boolean);
	if (parts.length <= 1) return "/";
	parts.pop();
	return `/${parts.join("/")}`;
}

function mapWebDAVError(error: unknown): Record<string, unknown> {
	if (!error || typeof error !== "object") {
		return { error: String(error) };
	}
	const e = error as { message?: string; status?: number };
	return { message: e.message, status: e.status };
}

function guessMimeType(name: string): string {
	const ext = name.split(".").pop()?.toLowerCase();
	const mimeMap: Record<string, string> = {
		pdf: "application/pdf",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		gif: "image/gif",
		webp: "image/webp",
		svg: "image/svg+xml",
		txt: "text/plain",
		md: "text/markdown",
		html: "text/html",
		css: "text/css",
		js: "application/javascript",
		ts: "application/typescript",
		json: "application/json",
		xml: "application/xml",
		zip: "application/zip",
		tar: "application/x-tar",
		gz: "application/gzip",
		mp4: "video/mp4",
		mp3: "audio/mpeg",
		wav: "audio/wav",
		doc: "application/msword",
		docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		xls: "application/vnd.ms-excel",
		xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		ppt: "application/vnd.ms-powerpoint",
		pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
	};
	return (
		(ext !== undefined ? mimeMap[ext] : undefined) ?? "application/octet-stream"
	);
}

export class WebDAVProvider implements IStorageProvider {
	private client: WebDAVClient | null = null;
	private config: WebDAVConfig | null = null;

	async initialize(config: ProviderConfig): Promise<void> {
		const parsed = WebDAVConfigSchema.safeParse(config);
		if (!parsed.success) {
			throw new ProviderError("webdav", "Invalid WebDAV configuration", {
				errors: parsed.error.errors,
			});
		}
		this.config = parsed.data;

		const clientOptions: Parameters<typeof createClient>[1] = {};
		if (parsed.data.username) {
			clientOptions.username = parsed.data.username;
		}
		if (parsed.data.password) {
			clientOptions.password = parsed.data.password;
		}

		this.client = createClient(parsed.data.serverUrl, clientOptions);
	}

	private ensureInitialized(): { client: WebDAVClient; config: WebDAVConfig } {
		if (!this.client || !this.config) {
			throw new ProviderError("webdav", "Provider not initialized");
		}
		return { client: this.client, config: this.config };
	}

	async testConnection(): Promise<boolean> {
		try {
			const { client, config } = this.ensureInitialized();
			const rootPath = config.rootPath ?? "/";
			await client.getDirectoryContents(rootPath);
			return true;
		} catch {
			return false;
		}
	}

	async getQuota(): Promise<ProviderQuota> {
		try {
			const { client, config } = this.ensureInitialized();
			const rootPath = config.rootPath ?? "/";
			const raw = await client.getQuota({ path: rootPath });
			if (!raw) return { used: 0, total: undefined, available: undefined };

			// getQuota can return DiskQuota or ResponseDataDetailed<DiskQuota | null>
			const diskQuota: DiskQuota | null =
				"data" in (raw as ResponseDataDetailed<DiskQuota | null>)
					? (raw as ResponseDataDetailed<DiskQuota | null>).data
					: (raw as DiskQuota);

			if (!diskQuota)
				return { used: 0, total: undefined, available: undefined };

			const used = diskQuota.used;
			const availableRaw = diskQuota.available;
			const available =
				typeof availableRaw === "number" ? availableRaw : undefined;
			const total = available !== undefined ? used + available : undefined;
			return { used, total, available };
		} catch {
			// Quota not supported by this server
		}
		return { used: 0, total: undefined, available: undefined };
	}

	async requestUpload(options: UploadOptions): Promise<UploadResponse> {
		const { config } = this.ensureInitialized();
		const parent = options.parentId ?? "/";
		const remotePath = resolvePath(
			config.rootPath,
			joinPath(parent, options.name),
		);

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
	): Promise<void> {
		const { client } = this.ensureInitialized();

		try {
			const dir = parentDir(remoteId);
			await client.createDirectory(dir, { recursive: true });

			let content: Buffer | ReadableStream;
			if (Buffer.isBuffer(data)) {
				content = data;
			} else {
				// Convert web ReadableStream to Node.js Buffer via reading chunks
				const reader = (data as ReadableStream).getReader();
				const chunks: Uint8Array[] = [];
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					if (value) chunks.push(value);
				}
				content = Buffer.concat(chunks.map((c) => Buffer.from(c)));
			}

			await client.putFileContents(remoteId, content as Buffer, {
				overwrite: true,
			});
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("webdav", "Failed to upload file", {
				remoteId,
				error: mapWebDAVError(error),
			});
		}
	}

	async requestDownload(options: DownloadOptions): Promise<DownloadResponse> {
		return {
			fileId: options.remoteId,
			downloadUrl: undefined,
			useDirectDownload: false,
		};
	}

	async downloadFile(remoteId: string): Promise<ReadableStream> {
		const { client } = this.ensureInitialized();

		try {
			const nodeStream = client.createReadStream(remoteId);
			return Readable.toWeb(nodeStream) as unknown as ReadableStream;
		} catch (error) {
			throw new ProviderError("webdav", "Failed to download file", {
				remoteId,
				error: mapWebDAVError(error),
			});
		}
	}

	async createFolder(options: CreateFolderOptions): Promise<string> {
		const { client, config } = this.ensureInitialized();
		const parent = options.parentId ?? "/";
		const remotePath = resolvePath(
			config.rootPath,
			joinPath(parent, options.name),
		);

		try {
			await client.createDirectory(remotePath, { recursive: true });
			return remotePath;
		} catch (error) {
			throw new ProviderError("webdav", "Failed to create folder", {
				remotePath,
				error: mapWebDAVError(error),
			});
		}
	}

	async delete(options: DeleteOptions): Promise<void> {
		const { client } = this.ensureInitialized();

		try {
			await client.deleteFile(options.remoteId);
		} catch (error) {
			throw new ProviderError("webdav", "Failed to delete", {
				remoteId: options.remoteId,
				error: mapWebDAVError(error),
			});
		}
	}

	async move(options: MoveOptions): Promise<void> {
		const { client } = this.ensureInitialized();
		const name = options.newName ?? basename(options.remoteId);
		const newParent = options.newParentId ?? parentDir(options.remoteId);
		const destination = joinPath(newParent, name);

		try {
			await client.moveFile(options.remoteId, destination);
		} catch (error) {
			throw new ProviderError("webdav", "Failed to move", {
				from: options.remoteId,
				to: destination,
				error: mapWebDAVError(error),
			});
		}
	}

	async copy(options: CopyOptions): Promise<string> {
		const { client } = this.ensureInitialized();
		const name = options.newName ?? basename(options.remoteId);
		const targetParent = options.targetParentId ?? parentDir(options.remoteId);
		const destination = joinPath(targetParent, name);

		try {
			await client.copyFile(options.remoteId, destination);
			return destination;
		} catch (error) {
			throw new ProviderError("webdav", "Failed to copy", {
				from: options.remoteId,
				to: destination,
				error: mapWebDAVError(error),
			});
		}
	}

	async list(options: ListOptions): Promise<ListResult> {
		const { client, config } = this.ensureInitialized();
		const remotePath = options.folderId
			? options.folderId
			: resolvePath(config.rootPath, "/");

		try {
			const items = await client.getDirectoryContents(remotePath);
			const contents = Array.isArray(items)
				? items
				: (items as { data: FileStat[] }).data;

			const files: FileMetadata[] = [];
			const folders: FolderMetadata[] = [];

			for (const item of contents) {
				if (item.type === "directory") {
					folders.push({
						remoteId: item.filename,
						name: item.basename,
						modifiedAt: item.lastmod ? new Date(item.lastmod) : new Date(),
					});
				} else {
					files.push({
						remoteId: item.filename,
						name: item.basename,
						mimeType: item.mime ?? guessMimeType(item.basename),
						size: item.size ?? 0,
						modifiedAt: item.lastmod ? new Date(item.lastmod) : new Date(),
					});
				}
			}

			return { files, folders };
		} catch (error) {
			throw new ProviderError("webdav", "Failed to list directory", {
				remotePath,
				error: mapWebDAVError(error),
			});
		}
	}

	async getFileMetadata(remoteId: string): Promise<FileMetadata> {
		const { client } = this.ensureInitialized();

		try {
			const stat = (await client.stat(remoteId)) as FileStat;

			if (stat.type === "directory") {
				throw new ProviderError("webdav", "Path is a directory, not a file", {
					remoteId,
				});
			}

			return {
				remoteId,
				name: stat.basename,
				mimeType: stat.mime ?? guessMimeType(stat.basename),
				size: stat.size ?? 0,
				modifiedAt: stat.lastmod ? new Date(stat.lastmod) : new Date(),
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("webdav", "Failed to get file metadata", {
				remoteId,
				error: mapWebDAVError(error),
			});
		}
	}

	async getFolderMetadata(remoteId: string): Promise<FolderMetadata> {
		const { client } = this.ensureInitialized();

		if (!remoteId || remoteId === "/") {
			return { remoteId, name: "/", modifiedAt: new Date() };
		}

		try {
			const stat = (await client.stat(remoteId)) as FileStat;

			return {
				remoteId,
				name: stat.basename,
				modifiedAt: stat.lastmod ? new Date(stat.lastmod) : new Date(),
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("webdav", "Failed to get folder metadata", {
				remoteId,
				error: mapWebDAVError(error),
			});
		}
	}

	async getAccountInfo(): Promise<{ email?: string; name?: string }> {
		const { config } = this.ensureInitialized();
		return { name: config.username };
	}

	async cleanup(): Promise<void> {
		this.client = null;
		this.config = null;
	}
}
