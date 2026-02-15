import { PassThrough, Readable } from "node:stream";
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
import * as ftp from "basic-ftp";
import { type FTPConfig, FTPConfigSchema } from "./schema";

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

function _stripRoot(rootPath: string | undefined, fullPath: string): string {
	const root = rootPath ? rootPath.replace(/\/+$/, "") : "";
	if (root && fullPath.startsWith(root)) {
		return fullPath.slice(root.length) || "/";
	}
	return fullPath;
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

function mapFtpError(error: unknown): Record<string, unknown> {
	if (!error || typeof error !== "object") {
		return { error: String(error) };
	}
	const e = error as { message?: string; code?: number };
	return { message: e.message, code: e.code };
}

export class FTPProvider implements IStorageProvider {
	private client: ftp.Client | null = null;
	private config: FTPConfig | null = null;

	async initialize(config: ProviderConfig): Promise<void> {
		const parsed = FTPConfigSchema.safeParse(config);
		if (!parsed.success) {
			throw new ProviderError("ftp", "Invalid FTP configuration", {
				errors: parsed.error.errors,
			});
		}
		this.config = parsed.data;
		this.client = new ftp.Client();
		this.client.ftp.verbose = false;
	}

	private ensureConfig(): FTPConfig {
		if (!this.config) {
			throw new ProviderError("ftp", "Provider not initialized");
		}
		return this.config;
	}

	private async getConnectedClient(): Promise<ftp.Client> {
		if (!this.client || !this.config) {
			throw new ProviderError("ftp", "Provider not initialized");
		}

		if (this.client.closed) {
			await this.client.access({
				host: this.config.host,
				port: this.config.port ?? 21,
				user: this.config.username,
				password: this.config.password,
				secure: this.config.secure ?? false,
			});
		}

		return this.client;
	}

	async testConnection(): Promise<boolean> {
		try {
			const config = this.ensureConfig();
			const testClient = new ftp.Client();
			testClient.ftp.verbose = false;
			await testClient.access({
				host: config.host,
				port: config.port ?? 21,
				user: config.username,
				password: config.password,
				secure: config.secure ?? false,
			});
			testClient.close();
			return true;
		} catch {
			return false;
		}
	}

	async getQuota(): Promise<ProviderQuota> {
		// FTP does not expose quota information
		return { used: 0, total: undefined, available: undefined };
	}

	async requestUpload(options: UploadOptions): Promise<UploadResponse> {
		const config = this.ensureConfig();
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
		const client = await this.getConnectedClient();

		try {
			const dir = parentDir(remoteId);
			await client.ensureDir(dir);
			await client.cd(dir);

			let readable: Readable;
			if (Buffer.isBuffer(data)) {
				readable = Readable.from(data);
			} else {
				readable = Readable.fromWeb(
					data as unknown as import("node:stream/web").ReadableStream,
				);
			}

			await client.uploadFrom(readable, basename(remoteId));
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("ftp", "Failed to upload file", {
				remoteId,
				error: mapFtpError(error),
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
		const client = await this.getConnectedClient();

		const passThrough = new PassThrough();

		client.downloadTo(passThrough, remoteId).catch((error: unknown) => {
			passThrough.destroy(
				error instanceof Error ? error : new Error(String(error)),
			);
		});

		return Readable.toWeb(passThrough) as unknown as ReadableStream;
	}

	async createFolder(options: CreateFolderOptions): Promise<string> {
		const config = this.ensureConfig();
		const client = await this.getConnectedClient();
		const parent = options.parentId ?? "/";
		const remotePath = resolvePath(
			config.rootPath,
			joinPath(parent, options.name),
		);

		try {
			await client.ensureDir(remotePath);
			return remotePath;
		} catch (error) {
			throw new ProviderError("ftp", "Failed to create folder", {
				remotePath,
				error: mapFtpError(error),
			});
		}
	}

	async delete(options: DeleteOptions): Promise<void> {
		const client = await this.getConnectedClient();

		try {
			if (options.isFolder) {
				await this.deleteFolderRecursive(client, options.remoteId);
			} else {
				await client.remove(options.remoteId);
			}
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("ftp", "Failed to delete", {
				remoteId: options.remoteId,
				error: mapFtpError(error),
			});
		}
	}

	private async deleteFolderRecursive(
		client: ftp.Client,
		remotePath: string,
	): Promise<void> {
		const items = await client.list(remotePath);

		for (const item of items) {
			const itemPath = joinPath(remotePath, item.name);
			if (item.type === ftp.FileType.Directory) {
				await this.deleteFolderRecursive(client, itemPath);
			} else {
				await client.remove(itemPath);
			}
		}

		await client.removeDir(remotePath);
	}

	async move(options: MoveOptions): Promise<void> {
		const client = await this.getConnectedClient();
		const name = options.newName ?? basename(options.remoteId);
		const newParent = options.newParentId ?? parentDir(options.remoteId);
		const destination = joinPath(newParent, name);

		try {
			await client.rename(options.remoteId, destination);
		} catch (error) {
			throw new ProviderError("ftp", "Failed to move", {
				from: options.remoteId,
				to: destination,
				error: mapFtpError(error),
			});
		}
	}

	async copy(options: CopyOptions): Promise<string> {
		// FTP has no native copy — download then re-upload
		const name = options.newName ?? basename(options.remoteId);
		const targetParent = options.targetParentId ?? parentDir(options.remoteId);
		const destination = joinPath(targetParent, name);

		// Collect the download into a buffer
		const downloadStream = await this.downloadFile(options.remoteId);
		const reader = downloadStream.getReader();
		const chunks: Uint8Array[] = [];

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) chunks.push(value);
		}

		const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
		await this.uploadFile(destination, buffer);
		return destination;
	}

	async list(options: ListOptions): Promise<ListResult> {
		const config = this.ensureConfig();
		const client = await this.getConnectedClient();
		const remotePath = options.folderId
			? options.folderId
			: resolvePath(config.rootPath, "/");

		try {
			const items = await client.list(remotePath);

			const files: FileMetadata[] = [];
			const folders: FolderMetadata[] = [];

			for (const item of items) {
				const itemPath = joinPath(remotePath, item.name);

				if (item.type === ftp.FileType.Directory) {
					folders.push({
						remoteId: itemPath,
						name: item.name,
						modifiedAt: item.modifiedAt ?? new Date(),
					});
				} else if (item.type === ftp.FileType.File) {
					files.push({
						remoteId: itemPath,
						name: item.name,
						mimeType: "application/octet-stream",
						size: item.size ?? 0,
						modifiedAt: item.modifiedAt ?? new Date(),
					});
				}
			}

			return { files, folders };
		} catch (error) {
			throw new ProviderError("ftp", "Failed to list directory", {
				remotePath,
				error: mapFtpError(error),
			});
		}
	}

	async getFileMetadata(remoteId: string): Promise<FileMetadata> {
		const client = await this.getConnectedClient();
		const dir = parentDir(remoteId);
		const name = basename(remoteId);

		try {
			const items = await client.list(dir);
			const item = items.find((i) => i.name === name);

			if (!item) {
				throw new ProviderError("ftp", "File not found", { remoteId });
			}

			return {
				remoteId,
				name: item.name,
				mimeType: "application/octet-stream",
				size: item.size ?? 0,
				modifiedAt: item.modifiedAt ?? new Date(),
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("ftp", "Failed to get file metadata", {
				remoteId,
				error: mapFtpError(error),
			});
		}
	}

	async getFolderMetadata(remoteId: string): Promise<FolderMetadata> {
		const client = await this.getConnectedClient();
		const dir = parentDir(remoteId);
		const name = basename(remoteId);

		// Root folder case
		if (!name || remoteId === "/") {
			return { remoteId, name: "/", modifiedAt: new Date() };
		}

		try {
			const items = await client.list(dir);
			const item = items.find(
				(i) => i.name === name && i.type === ftp.FileType.Directory,
			);

			if (!item) {
				throw new ProviderError("ftp", "Folder not found", { remoteId });
			}

			return {
				remoteId,
				name: item.name,
				modifiedAt: item.modifiedAt ?? new Date(),
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("ftp", "Failed to get folder metadata", {
				remoteId,
				error: mapFtpError(error),
			});
		}
	}

	async getAccountInfo(): Promise<{ email?: string; name?: string }> {
		const config = this.ensureConfig();
		return { name: config.username };
	}

	async cleanup(): Promise<void> {
		if (this.client && !this.client.closed) {
			this.client.close();
		}
		this.client = null;
		this.config = null;
	}
}
