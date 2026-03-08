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
import SMB2 from "@marsaud/smb2";
import { type SambaConfig, SambaConfigSchema } from "./schema";

// Paths in @marsaud/smb2 are relative to the share root, never start with \
function joinPath(base: string, ...parts: string[]): string {
	return [base, ...parts]
		.join("\\")
		.split(/[\\/]/)
		.filter((s) => s.length > 0)
		.join("\\");
}

function resolvePath(rootPath: string | undefined, remotePath: string): string {
	const root = rootPath
		? rootPath.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "")
		: "";
	const normalized = (remotePath ?? "")
		.replace(/\//g, "\\")
		.replace(/^\\+/, "")
		.replace(/\\+$/, "");
	if (!normalized) return root;
	return root ? `${root}\\${normalized}` : normalized;
}

function basename(path: string): string {
	const parts = path
		.replace(/[/\\]+$/, "")
		.split(/[\\/]/)
		.filter(Boolean);
	return parts[parts.length - 1] ?? path;
}

function parentDir(path: string): string {
	const parts = path
		.replace(/[/\\]+$/, "")
		.split(/[\\/]/)
		.filter(Boolean);
	if (parts.length <= 1) return "\\";
	parts.pop();
	return parts.join("\\");
}

function mapSmbError(error: unknown): Record<string, unknown> {
	if (!error || typeof error !== "object") {
		return { rawError: String(error) };
	}
	const e = error as { message?: string; code?: string; stack?: string };
	return { message: e.message, code: e.code, originalStack: e.stack };
}

export class SambaProvider implements IStorageProvider {
	private smb: SMB2 | null = null;
	private config: SambaConfig | null = null;

	async initialize(config: ProviderConfig): Promise<void> {
		const parsed = SambaConfigSchema.safeParse(config);
		if (!parsed.success) {
			throw new ProviderError("samba", "Invalid Samba configuration", {
				errors: parsed.error.errors,
			});
		}
		this.config = parsed.data;
		const shareStr = `\\\\${parsed.data.host}\\${parsed.data.share}`;
		this.smb = new SMB2({
			share: shareStr,
			domain: parsed.data.domain ?? "",
			username: parsed.data.username,
			password: parsed.data.password,
			port: parsed.data.port ?? 445,
			autoCloseTimeout: 10000,
		});
	}

	private ensureInitialized(): { smb: SMB2; config: SambaConfig } {
		if (!this.smb || !this.config) {
			throw new ProviderError("samba", "Provider not initialized");
		}
		return { smb: this.smb, config: this.config };
	}

	async testConnection(): Promise<boolean> {
		try {
			const { smb, config } = this.ensureInitialized();
			const root = config.rootPath ? resolvePath(config.rootPath, "") : "";
			await new Promise<void>((resolve, reject) => {
				smb.readdir(root, (err) => {
					if (err) reject(err);
					else resolve();
				});
			});
			return true;
		} catch {
			return false;
		}
	}

	async getQuota(): Promise<ProviderQuota> {
		// SMB does not expose quota via this library
		return { used: 0, total: undefined, available: undefined };
	}

	async requestUpload(options: UploadOptions): Promise<UploadResponse> {
		const { config } = this.ensureInitialized();
		const parent = options.parentId ?? "";
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
	): Promise<string | undefined> {
		const { smb } = this.ensureInitialized();

		// Ensure parent directory exists
		const dir = parentDir(remoteId);
		if (dir && dir !== "\\") {
			await this.ensureDir(smb, dir);
		}

		let buffer: Buffer;
		if (Buffer.isBuffer(data)) {
			buffer = data;
		} else {
			const readable = Readable.fromWeb(
				data as unknown as import("node:stream/web").ReadableStream,
			);
			const chunks: Buffer[] = [];
			for await (const chunk of readable) {
				chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
			}
			buffer = Buffer.concat(chunks);
		}

		await new Promise<void>((resolve, reject) => {
			smb.writeFile(remoteId, buffer, (err) => {
				if (err) reject(err);
				else resolve();
			});
		});

		return undefined;
	}

	private async ensureDir(smb: SMB2, dirPath: string): Promise<void> {
		if (!dirPath) return;
		const parts = dirPath.split("\\").filter(Boolean);
		let current = "";
		for (const part of parts) {
			current = current ? `${current}\\${part}` : part;
			await new Promise<void>((resolve) => {
				smb.mkdir(current, () => resolve()); // ignore — dir may already exist
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
		const { smb } = this.ensureInitialized();

		const buffer = await new Promise<Buffer>((resolve, reject) => {
			smb.readFile(remoteId, (err, data) => {
				if (err) reject(err);
				else resolve(data as Buffer);
			});
		});

		const readable = Readable.from(buffer);
		return Readable.toWeb(readable) as unknown as ReadableStream;
	}

	async createFolder(options: CreateFolderOptions): Promise<string> {
		const { smb, config } = this.ensureInitialized();
		const parent = options.parentId ?? "";
		const remotePath = resolvePath(
			config.rootPath,
			joinPath(parent, options.name),
		);

		try {
			await new Promise<void>((resolve, reject) => {
				smb.mkdir(remotePath, (err) => {
					if (err) reject(err);
					else resolve();
				});
			});
			return remotePath;
		} catch (error) {
			throw new ProviderError("samba", "Failed to create folder", {
				op: "createFolder",
				remotePath,
				error: mapSmbError(error),
			});
		}
	}

	async delete(options: DeleteOptions): Promise<void> {
		const { smb } = this.ensureInitialized();

		try {
			if (options.isFolder) {
				await this.deleteFolderRecursive(smb, options.remoteId);
			} else {
				await new Promise<void>((resolve, reject) => {
					smb.unlink(options.remoteId, (err) => {
						if (err) reject(err);
						else resolve();
					});
				});
			}
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("samba", "Failed to delete", {
				op: "delete",
				remoteId: options.remoteId,
				error: mapSmbError(error),
			});
		}
	}

	private async deleteFolderRecursive(
		smb: SMB2,
		remotePath: string,
	): Promise<void> {
		const entries = await new Promise<string[]>((resolve, reject) => {
			smb.readdir(remotePath, (err, files) => {
				if (err) reject(err);
				else resolve(files as string[]);
			});
		});

		for (const entry of entries) {
			const entryPath = joinPath(remotePath, entry);
			// Try delete as file first, fall back to recursive folder delete
			const deleted = await new Promise<boolean>((resolve) => {
				smb.unlink(entryPath, (err) => resolve(!err));
			});
			if (!deleted) {
				await this.deleteFolderRecursive(smb, entryPath);
			}
		}

		await new Promise<void>((resolve, reject) => {
			smb.rmdir(remotePath, (err) => {
				if (err) reject(err);
				else resolve();
			});
		});
	}

	async move(options: MoveOptions): Promise<void> {
		const { smb } = this.ensureInitialized();
		const name = options.newName ?? basename(options.remoteId);
		const newParent = options.newParentId ?? parentDir(options.remoteId);
		const destination = joinPath(newParent, name);

		try {
			await new Promise<void>((resolve, reject) => {
				smb.rename(options.remoteId, destination, (err) => {
					if (err) reject(err);
					else resolve();
				});
			});
		} catch (error) {
			throw new ProviderError("samba", "Failed to move", {
				op: "move",
				from: options.remoteId,
				to: destination,
				error: mapSmbError(error),
			});
		}
	}

	async copy(options: CopyOptions): Promise<string> {
		// SMB2 has no native copy — download then re-upload
		const name = options.newName ?? basename(options.remoteId);
		const targetParent = options.targetParentId ?? parentDir(options.remoteId);
		const destination = joinPath(targetParent, name);

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
		const { smb, config } = this.ensureInitialized();
		const remotePath = options.folderId
			? options.folderId
			: resolvePath(config.rootPath, "");

		try {
			const entries = await new Promise<string[]>((resolve, reject) => {
				smb.readdir(remotePath, (err, files) => {
					if (err) reject(err);
					else resolve(files as string[]);
				});
			});

			const files: FileMetadata[] = [];
			const folders: FolderMetadata[] = [];

			for (const entry of entries) {
				if (entry === "." || entry === "..") continue;
				const entryPath = joinPath(remotePath, entry);

				// Probe whether it's a directory by attempting readdir
				const isDir = await new Promise<boolean>((resolve) => {
					smb.readdir(entryPath, (err) => resolve(!err));
				});

				if (isDir) {
					folders.push({
						remoteId: entryPath,
						name: entry,
						modifiedAt: new Date(),
					});
				} else {
					files.push({
						remoteId: entryPath,
						name: entry,
						mimeType: "application/octet-stream",
						size: 0,
						modifiedAt: new Date(),
					});
				}
			}

			return { files, folders };
		} catch (error) {
			throw new ProviderError("samba", "Failed to list directory", {
				op: "list",
				remotePath,
				error: mapSmbError(error),
			});
		}
	}

	async getFileMetadata(remoteId: string): Promise<FileMetadata> {
		return {
			remoteId,
			name: basename(remoteId),
			mimeType: "application/octet-stream",
			size: 0,
			modifiedAt: new Date(),
		};
	}

	async getFolderMetadata(remoteId: string): Promise<FolderMetadata> {
		return {
			remoteId,
			name: basename(remoteId) || "/",
			modifiedAt: new Date(),
		};
	}

	async getAccountInfo(): Promise<{ email?: string; name?: string }> {
		const { config } = this.ensureInitialized();
		return { name: `${config.username}@${config.host}` };
	}

	async cleanup(): Promise<void> {
		if (this.smb) {
			this.smb.disconnect?.();
		}
		this.smb = null;
		this.config = null;
	}
}
