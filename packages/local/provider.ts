import { createReadStream, createWriteStream } from "node:fs";
import {
	access,
	constants,
	copyFile,
	cp,
	mkdir,
	readdir,
	rename,
	rm,
	stat,
	writeFile,
} from "node:fs/promises";
import {
	dirname,
	isAbsolute,
	join,
	normalize,
	relative,
	resolve,
	sep,
} from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
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
import type { LocalConfig } from "./schema";
import { LocalConfigSchema } from "./schema";

export class LocalProvider implements IStorageProvider {
	private config: LocalConfig | null = null;
	private rootPath: string | null = null;

	async initialize(config: ProviderConfig): Promise<void> {
		const parsed = LocalConfigSchema.safeParse(config);
		if (!parsed.success) {
			throw new ProviderError("local", "Invalid local storage configuration", {
				errors: parsed.error.errors,
			});
		}

		const resolvedRootPath = resolve(parsed.data.rootPath);
		await mkdir(resolvedRootPath, { recursive: true });

		this.config = parsed.data;
		this.rootPath = resolvedRootPath;
	}

	async testConnection(): Promise<boolean> {
		try {
			const rootPath = this.ensureRootPath();
			await access(rootPath, constants.R_OK | constants.W_OK);
			return true;
		} catch {
			return false;
		}
	}

	async getQuota(): Promise<ProviderQuota> {
		const rootPath = this.ensureRootPath();

		try {
			const used = await this.computeDirectorySize(rootPath);
			return {
				used,
				total: undefined,
				available: undefined,
			};
		} catch (error) {
			throw new ProviderError(
				"local",
				"Failed to compute local storage usage",
				{
					error: String(error),
				},
			);
		}
	}

	async requestUpload(options: UploadOptions): Promise<UploadResponse> {
		const remoteId = this.joinRemoteId(options.parentId, options.name);

		return {
			fileId: remoteId,
			uploadUrl: undefined,
			uploadFields: undefined,
			useDirectUpload: false,
		};
	}

	async uploadFile(
		remoteId: string,
		data: ReadableStream | Buffer,
	): Promise<void> {
		const fullPath = this.resolveRemotePath(remoteId);

		try {
			await mkdir(dirname(fullPath), { recursive: true });

			if (Buffer.isBuffer(data)) {
				await writeFile(fullPath, data);
				return;
			}

			const nodeReadable = Readable.fromWeb(
				data as unknown as import("node:stream/web").ReadableStream,
			);
			const writer = createWriteStream(fullPath);
			await pipeline(nodeReadable, writer);
		} catch (error) {
			throw new ProviderError("local", "Failed to upload file", {
				remoteId,
				error: String(error),
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
		const fullPath = this.resolveRemotePath(remoteId);

		try {
			const stream = createReadStream(fullPath);
			return Readable.toWeb(stream) as unknown as ReadableStream;
		} catch (error) {
			throw new ProviderError("local", "Failed to download file", {
				remoteId,
				error: String(error),
			});
		}
	}

	async createFolder(options: CreateFolderOptions): Promise<string> {
		const remoteId = this.joinRemoteId(options.parentId, options.name);
		const fullPath = this.resolveRemotePath(remoteId);

		try {
			await mkdir(fullPath, { recursive: true });
			return remoteId;
		} catch (error) {
			throw new ProviderError("local", "Failed to create folder", {
				remoteId,
				error: String(error),
			});
		}
	}

	async delete(options: DeleteOptions): Promise<void> {
		const fullPath = this.resolveRemotePath(options.remoteId);

		try {
			if (options.isFolder) {
				await rm(fullPath, { recursive: true, force: true });
			} else {
				await rm(fullPath, { force: true });
			}
		} catch (error) {
			throw new ProviderError("local", "Failed to delete path", {
				remoteId: options.remoteId,
				error: String(error),
			});
		}
	}

	async move(options: MoveOptions): Promise<void> {
		const sourcePath = this.resolveRemotePath(options.remoteId);
		const sourceName = this.getBasename(options.remoteId);
		const destinationRemoteId = this.joinRemoteId(
			options.newParentId,
			options.newName ?? sourceName,
		);
		const destinationPath = this.resolveRemotePath(destinationRemoteId);

		try {
			await mkdir(dirname(destinationPath), { recursive: true });
			await rename(sourcePath, destinationPath);
		} catch (error) {
			const err = error as NodeJS.ErrnoException;
			if (err.code !== "EXDEV") {
				throw new ProviderError("local", "Failed to move path", {
					remoteId: options.remoteId,
					destinationRemoteId,
					error: String(error),
				});
			}

			// Cross-device fallback.
			const sourceStat = await stat(sourcePath);
			if (sourceStat.isDirectory()) {
				await cp(sourcePath, destinationPath, { recursive: true, force: true });
				await rm(sourcePath, { recursive: true, force: true });
			} else {
				await copyFile(sourcePath, destinationPath);
				await rm(sourcePath, { force: true });
			}
		}
	}

	async copy(options: CopyOptions): Promise<string> {
		const sourcePath = this.resolveRemotePath(options.remoteId);
		const sourceName = this.getBasename(options.remoteId);
		const destinationRemoteId = this.joinRemoteId(
			options.targetParentId,
			options.newName ?? sourceName,
		);
		const destinationPath = this.resolveRemotePath(destinationRemoteId);

		try {
			await mkdir(dirname(destinationPath), { recursive: true });

			const sourceStat = await stat(sourcePath);
			if (sourceStat.isDirectory()) {
				await cp(sourcePath, destinationPath, { recursive: true, force: true });
			} else {
				await copyFile(sourcePath, destinationPath);
			}

			return destinationRemoteId;
		} catch (error) {
			throw new ProviderError("local", "Failed to copy path", {
				remoteId: options.remoteId,
				destinationRemoteId,
				error: String(error),
			});
		}
	}

	async list(options: ListOptions): Promise<ListResult> {
		const targetDirectory = this.resolveRemotePath(options.folderId);
		const folderRemoteId = this.normalizeRemoteId(options.folderId);

		try {
			const entries = await readdir(targetDirectory, { withFileTypes: true });

			const sortedEntries = entries
				.slice()
				.sort((a, b) => a.name.localeCompare(b.name));

			const limit = options.limit ?? sortedEntries.length;
			const pageToken = Number(options.pageToken ?? "0");
			const safePageToken =
				Number.isFinite(pageToken) && pageToken >= 0 ? pageToken : 0;

			const windowedEntries = sortedEntries.slice(
				safePageToken,
				safePageToken + limit,
			);

			const files: FileMetadata[] = [];
			const folders: FolderMetadata[] = [];

			for (const entry of windowedEntries) {
				const remoteId = this.joinRemoteId(folderRemoteId, entry.name);
				const entryPath = join(targetDirectory, entry.name);
				const metadata = await stat(entryPath);

				if (entry.isDirectory()) {
					folders.push({
						remoteId,
						name: entry.name,
						modifiedAt: metadata.mtime,
					});
					continue;
				}

				files.push({
					remoteId,
					name: entry.name,
					mimeType: this.detectMimeType(entry.name),
					size: metadata.size,
					modifiedAt: metadata.mtime,
				});
			}

			const nextPageIndex = safePageToken + windowedEntries.length;
			const nextPageToken =
				nextPageIndex < sortedEntries.length
					? String(nextPageIndex)
					: undefined;

			return {
				files,
				folders,
				nextPageToken,
			};
		} catch (error) {
			throw new ProviderError("local", "Failed to list directory", {
				folderId: options.folderId,
				error: String(error),
			});
		}
	}

	async getFileMetadata(remoteId: string): Promise<FileMetadata> {
		const fullPath = this.resolveRemotePath(remoteId);

		try {
			const fileStat = await stat(fullPath);
			if (fileStat.isDirectory()) {
				throw new ProviderError(
					"local",
					"Requested metadata for folder as file",
					{
						remoteId,
					},
				);
			}

			return {
				remoteId: this.normalizeRemoteId(remoteId),
				name: this.getBasename(remoteId),
				mimeType: this.detectMimeType(remoteId),
				size: fileStat.size,
				modifiedAt: fileStat.mtime,
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("local", "Failed to get file metadata", {
				remoteId,
				error: String(error),
			});
		}
	}

	async getFolderMetadata(remoteId: string): Promise<FolderMetadata> {
		const fullPath = this.resolveRemotePath(remoteId);

		try {
			const folderStat = await stat(fullPath);
			if (!folderStat.isDirectory()) {
				throw new ProviderError(
					"local",
					"Requested metadata for file as folder",
					{
						remoteId,
					},
				);
			}

			return {
				remoteId: this.normalizeRemoteId(remoteId),
				name: this.getBasename(remoteId),
				modifiedAt: folderStat.mtime,
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("local", "Failed to get folder metadata", {
				remoteId,
				error: String(error),
			});
		}
	}

	async cleanup(): Promise<void> {
		this.config = null;
		this.rootPath = null;
	}

	private ensureRootPath(): string {
		if (!this.rootPath || !this.config) {
			throw new ProviderError("local", "Provider not initialized");
		}
		return this.rootPath;
	}

	private normalizeRemoteId(remoteId?: string): string {
		if (!remoteId) return "";
		return remoteId.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
	}

	private resolveRemotePath(remoteId?: string): string {
		const rootPath = this.ensureRootPath();
		const normalizedRemoteId = this.normalizeRemoteId(remoteId);
		const normalizedRelative = normalize(normalizedRemoteId);
		const candidate = resolve(rootPath, normalizedRelative);
		const rel = relative(rootPath, candidate);

		if (rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
			throw new ProviderError("local", "Path traversal is not allowed", {
				remoteId,
			});
		}

		return candidate;
	}

	private joinRemoteId(parentId: string | undefined, name: string): string {
		const cleanName = name.replace(/[\\/]+/g, "_").trim();
		const parent = this.normalizeRemoteId(parentId);
		return parent ? `${parent}/${cleanName}` : cleanName;
	}

	private getBasename(remoteId: string): string {
		const normalized = this.normalizeRemoteId(remoteId);
		if (!normalized) return "";
		const segments = normalized.split("/").filter(Boolean);
		return segments[segments.length - 1] ?? normalized;
	}

	private detectMimeType(fileName: string): string {
		const lower = fileName.toLowerCase();
		if (lower.endsWith(".png")) return "image/png";
		if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
		if (lower.endsWith(".gif")) return "image/gif";
		if (lower.endsWith(".webp")) return "image/webp";
		if (lower.endsWith(".pdf")) return "application/pdf";
		if (lower.endsWith(".txt")) return "text/plain";
		if (lower.endsWith(".csv")) return "text/csv";
		if (lower.endsWith(".json")) return "application/json";
		if (lower.endsWith(".zip")) return "application/zip";
		if (lower.endsWith(".mp3")) return "audio/mpeg";
		if (lower.endsWith(".mp4")) return "video/mp4";
		return "application/octet-stream";
	}

	private async computeDirectorySize(directoryPath: string): Promise<number> {
		let total = 0;
		const entries = await readdir(directoryPath, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = join(directoryPath, entry.name);
			if (entry.isDirectory()) {
				total += await this.computeDirectorySize(fullPath);
				continue;
			}

			if (entry.isFile()) {
				const fileStat = await stat(fullPath);
				total += fileStat.size;
			}
		}

		return total;
	}
}
