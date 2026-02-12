import { env } from "../config/env";
import type { Database } from "@drivebase/db";
import { files, folders } from "@drivebase/db";
import { eq, and, like, desc, isNull } from "drizzle-orm";
import {
	NotFoundError,
	ValidationError,
	ConflictError,
	sanitizeFilename,
	normalizePath,
	joinPath,
	getParentPath,
} from "@drivebase/core";
import { logger } from "../utils/logger";
import { ProviderService } from "./provider";
import { FolderService } from "./folder";

export class FileService {
	constructor(private db: Database) {}

	/**
	 * Request file upload
	 * Returns upload information (URL or file ID for direct upload)
	 */
	async requestUpload(
		userId: string,
		name: string,
		mimeType: string,
		size: number,
		folderId: string | undefined,
		providerId: string,
	) {
		logger.debug({ msg: "Requesting upload", userId, name, size, providerId });
		// Validate inputs
		if (!name || name.trim().length === 0) {
			throw new ValidationError("File name is required");
		}

		if (size <= 0) {
			throw new ValidationError("File size must be greater than 0");
		}

		try {
			// Sanitize filename
			const sanitizedName = sanitizeFilename(name);

			// Get folder if specified
			let folder = null;
			let virtualPath: string;

			if (folderId) {
				const folderService = new FolderService(this.db);
				folder = await folderService.getFolder(folderId, userId);
				virtualPath = joinPath(folder.virtualPath, sanitizedName);
			} else {
				virtualPath = joinPath("/", sanitizedName);
			}

			// Check if file path already exists (active or soft-deleted).
			// Since virtualPath is globally unique, we must revive soft-deleted rows.
			const [existing] = await this.db
				.select()
				.from(files)
				.where(eq(files.virtualPath, virtualPath))
				.limit(1);

			if (existing && !existing.isDeleted) {
				throw new ConflictError(`File already exists at path: ${virtualPath}`);
			}

			// Get provider
			const providerService = new ProviderService(this.db);
			const providerRecord = await providerService.getProvider(
				providerId,
				userId,
			);
			const provider =
				await providerService.getProviderInstance(providerRecord);

			// Resolve parent: explicit folder → its remoteId, no folder → provider root folder
			const parentId =
				folder?.remoteId ?? providerRecord.rootFolderId ?? undefined;

			// Request upload from provider
			const uploadResponse = await provider.requestUpload({
				name: sanitizedName,
				mimeType,
				size,
				parentId,
			});

			await provider.cleanup();

			// Create or revive file record in database with pending status.
			const [fileRecord] = existing
				? await this.db
						.update(files)
						.set({
							name: sanitizedName,
							mimeType,
							size,
							remoteId: uploadResponse.fileId,
							providerId,
							folderId: folderId ?? null,
							uploadedBy: userId,
							isDeleted: false,
							starred: false,
							updatedAt: new Date(),
						})
						.where(eq(files.id, existing.id))
						.returning()
				: await this.db
						.insert(files)
						.values({
							virtualPath,
							name: sanitizedName,
							mimeType,
							size,
							remoteId: uploadResponse.fileId,
							providerId,
							folderId: folderId ?? null,
							uploadedBy: userId,
							isDeleted: false,
						})
						.returning();

			if (!fileRecord) {
				throw new Error("Failed to create file record");
			}

			const baseUrl = env.API_BASE_URL ?? `http://localhost:${env.PORT}`;
			const proxyUrl = `${baseUrl}/api/upload/proxy?fileId=${fileRecord.id}`;

			const uploadUrl = uploadResponse.useDirectUpload
				? uploadResponse.uploadUrl
				: proxyUrl;

			logger.debug({
				msg: "Upload requested",
				fileId: fileRecord.id,
				useDirectUpload: uploadResponse.useDirectUpload,
				uploadUrl,
			});

			return {
				file: fileRecord,
				uploadUrl,
				uploadFields: uploadResponse.uploadFields,
				useDirectUpload: uploadResponse.useDirectUpload,
			};
		} catch (error) {
			logger.error({ msg: "Request upload failed", userId, name, error });
			throw error;
		}
	}

	/**
	 * Get file by ID
	 */
	async getFile(fileId: string, userId: string) {
		// logger.debug({ msg: "Getting file", fileId, userId }); // Too verbose for frequent op?
		const [file] = await this.db
			.select()
			.from(files)
			.where(and(eq(files.id, fileId), eq(files.isDeleted, false)))
			.limit(1);

		if (!file) {
			// logger.debug({ msg: "File not found", fileId, userId });
			throw new NotFoundError("File");
		}

		// TODO: Check permissions

		return file;
	}

	/**
	 * List files in a folder
	 */
	async listFiles(
		userId: string,
		folderId?: string,
		limit: number = 50,
		offset: number = 0,
	) {
		logger.debug({ msg: "Listing files", userId, folderId, limit, offset });
		let fileList;

		try {
			if (folderId) {
				fileList = await this.db
					.select()
					.from(files)
					.where(and(eq(files.folderId, folderId), eq(files.isDeleted, false)))
					.limit(limit)
					.offset(offset)
					.orderBy(desc(files.createdAt));
			} else {
				// No folderId = root level only (folderId IS NULL)
				fileList = await this.db
					.select()
					.from(files)
					.where(and(isNull(files.folderId), eq(files.isDeleted, false)))
					.limit(limit)
					.offset(offset)
					.orderBy(desc(files.createdAt));
			}

			// Count total
			// TODO: Implement proper count query
			const total = fileList.length;

			return {
				files: fileList,
				total,
				hasMore: fileList.length === limit,
			};
		} catch (error) {
			logger.error({ msg: "List files failed", userId, folderId, error });
			throw error;
		}
	}

	/**
	 * Search files by name
	 */
	async searchFiles(userId: string, query: string, limit: number = 50) {
		logger.debug({ msg: "Searching files", userId, query });
		const searchPattern = `%${query}%`;

		try {
			return await this.db
				.select()
				.from(files)
				.where(and(like(files.name, searchPattern), eq(files.isDeleted, false)))
				.limit(limit)
				.orderBy(files.name);
		} catch (error) {
			logger.error({ msg: "Search files failed", userId, query, error });
			throw error;
		}
	}

	/**
	 * Request file download
	 */
	async requestDownload(fileId: string, userId: string) {
		logger.debug({ msg: "Requesting download", userId, fileId });

		try {
			// Get file
			const file = await this.getFile(fileId, userId);

			// Get provider
			const providerService = new ProviderService(this.db);
			const providerRecord = await providerService.getProvider(
				file.providerId,
				userId,
			);
			const provider =
				await providerService.getProviderInstance(providerRecord);

			// Request download from provider
			const downloadResponse = await provider.requestDownload({
				remoteId: file.remoteId,
			});

			await provider.cleanup();

			const baseUrl = env.API_BASE_URL ?? `http://localhost:${env.PORT}`;
			const proxyUrl = `${baseUrl}/api/download/proxy?fileId=${file.id}`;
			const canUseDirectDownload =
				downloadResponse.useDirectDownload &&
				Boolean(downloadResponse.downloadUrl);

			logger.debug({
				msg: "Download requested",
				fileId,
				useDirectDownload: canUseDirectDownload,
				downloadUrl: canUseDirectDownload
					? downloadResponse.downloadUrl
					: proxyUrl,
			});

			return {
				file,
				downloadUrl: canUseDirectDownload
					? (downloadResponse.downloadUrl ?? undefined)
					: proxyUrl,
				useDirectDownload: canUseDirectDownload,
			};
		} catch (error) {
			logger.error({ msg: "Request download failed", userId, fileId, error });
			throw error;
		}
	}

	/**
	 * Download file stream (for proxy download)
	 */
	async downloadFile(fileId: string, userId: string): Promise<ReadableStream> {
		logger.debug({ msg: "Downloading file stream", userId, fileId });
		try {
			// Get file
			const file = await this.getFile(fileId, userId);

			// Get provider
			const providerService = new ProviderService(this.db);
			const providerRecord = await providerService.getProvider(
				file.providerId,
				userId,
			);
			const provider =
				await providerService.getProviderInstance(providerRecord);

			// Download file from provider
			const stream = await provider.downloadFile(file.remoteId);

			// Note: Don't cleanup provider here as stream is still being read
			// Cleanup should happen after stream is consumed

			return stream;
		} catch (error) {
			logger.error({
				msg: "Download file stream failed",
				userId,
				fileId,
				error,
			});
			throw error;
		}
	}

	/**
	 * Rename a file
	 */
	async renameFile(fileId: string, userId: string, newName: string) {
		logger.debug({ msg: "Renaming file", userId, fileId, newName });

		try {
			// Get file
			const file = await this.getFile(fileId, userId);

			// Sanitize new name
			const sanitizedName = sanitizeFilename(newName);

			if (!sanitizedName) {
				throw new ValidationError("File name is required");
			}

			// Calculate new virtual path
			const parentPath = getParentPath(file.virtualPath);
			const newVirtualPath = joinPath(parentPath, sanitizedName);

			// Check if file exists at new path
			const [existing] = await this.db
				.select()
				.from(files)
				.where(
					and(
						eq(files.virtualPath, newVirtualPath),
						eq(files.isDeleted, false),
					),
				)
				.limit(1);

			if (existing && existing.id !== fileId) {
				throw new ConflictError(
					`File already exists at path: ${newVirtualPath}`,
				);
			}

			// Rename in provider
			const providerService = new ProviderService(this.db);
			const providerRecord = await providerService.getProvider(
				file.providerId,
				userId,
			);
			const provider =
				await providerService.getProviderInstance(providerRecord);

			await provider.move({
				remoteId: file.remoteId,
				newName: sanitizedName,
			});

			await provider.cleanup();

			// Update file in database
			const [updated] = await this.db
				.update(files)
				.set({
					name: sanitizedName,
					virtualPath: newVirtualPath,
					updatedAt: new Date(),
				})
				.where(eq(files.id, fileId))
				.returning();

			if (!updated) {
				throw new Error("Failed to rename file");
			}

			logger.debug({
				msg: "File renamed",
				fileId,
				oldName: file.name,
				newName: sanitizedName,
			});

			return updated;
		} catch (error) {
			logger.error({
				msg: "Rename file failed",
				userId,
				fileId,
				newName,
				error,
			});
			throw error;
		}
	}

	/**
	 * Move file to a different folder
	 */
	async moveFile(fileId: string, userId: string, newFolderId?: string) {
		logger.debug({ msg: "Moving file", userId, fileId, newFolderId });

		try {
			// Get file
			const file = await this.getFile(fileId, userId);

			// Get new folder if specified
			let newFolder = null;
			let newVirtualPath: string;

			if (newFolderId) {
				const folderService = new FolderService(this.db);
				newFolder = await folderService.getFolder(newFolderId, userId);
				newVirtualPath = joinPath(newFolder.virtualPath, file.name);
			} else {
				// Moving to root
				newVirtualPath = joinPath("/", file.name);
			}

			// Check if file exists at new path
			const [existing] = await this.db
				.select()
				.from(files)
				.where(
					and(
						eq(files.virtualPath, newVirtualPath),
						eq(files.isDeleted, false),
					),
				)
				.limit(1);

			if (existing && existing.id !== fileId) {
				throw new ConflictError(
					`File already exists at path: ${newVirtualPath}`,
				);
			}

			// Move in provider
			const providerService = new ProviderService(this.db);
			const providerRecord = await providerService.getProvider(
				file.providerId,
				userId,
			);
			const provider =
				await providerService.getProviderInstance(providerRecord);

			await provider.move({
				remoteId: file.remoteId,
				newParentId: newFolder?.remoteId ?? undefined,
			});

			await provider.cleanup();

			// Update file in database
			const [updated] = await this.db
				.update(files)
				.set({
					folderId: newFolderId ?? null,
					virtualPath: newVirtualPath,
					updatedAt: new Date(),
				})
				.where(eq(files.id, fileId))
				.returning();

			if (!updated) {
				throw new Error("Failed to move file");
			}

			logger.debug({
				msg: "File moved",
				fileId,
				oldPath: file.virtualPath,
				newPath: newVirtualPath,
			});

			return updated;
		} catch (error) {
			logger.error({
				msg: "Move file failed",
				userId,
				fileId,
				newFolderId,
				error,
			});
			throw error;
		}
	}

	/**
	 * Delete a file (soft delete)
	 */
	async deleteFile(fileId: string, userId: string) {
		logger.debug({ msg: "Deleting file", userId, fileId });

		try {
			// Get file
			const file = await this.getFile(fileId, userId);

			// Delete from provider
			const providerService = new ProviderService(this.db);
			const providerRecord = await providerService.getProvider(
				file.providerId,
				userId,
			);
			const provider =
				await providerService.getProviderInstance(providerRecord);

			await provider.delete({
				remoteId: file.remoteId,
				isFolder: false,
			});

			await provider.cleanup();

			// Soft delete file in database
			await this.db
				.update(files)
				.set({
					isDeleted: true,
					updatedAt: new Date(),
				})
				.where(eq(files.id, fileId));

			logger.debug({ msg: "File deleted", fileId });
		} catch (error) {
			logger.error({ msg: "Delete file failed", userId, fileId, error });
			throw error;
		}
	}

	/**
	 * Get file metadata
	 */
	async getFileMetadata(fileId: string, userId: string) {
		logger.debug({ msg: "Getting file metadata", userId, fileId });

		try {
			// Get file
			const file = await this.getFile(fileId, userId);

			// Get metadata from provider
			const providerService = new ProviderService(this.db);
			const providerRecord = await providerService.getProvider(
				file.providerId,
				userId,
			);
			const provider =
				await providerService.getProviderInstance(providerRecord);

			const metadata = await provider.getFileMetadata(file.remoteId);

			await provider.cleanup();

			return {
				...file,
				providerMetadata: metadata,
			};
		} catch (error) {
			logger.error({ msg: "Get file metadata failed", userId, fileId, error });
			throw error;
		}
	}

	/**
	 * Star a file
	 */
	async starFile(fileId: string, userId: string) {
		logger.debug({ msg: "Starring file", userId, fileId });
		try {
			// Get file to ensure it exists and user has access
			await this.getFile(fileId, userId);

			// Star the file
			const [updated] = await this.db
				.update(files)
				.set({
					starred: true,
					updatedAt: new Date(),
				})
				.where(eq(files.id, fileId))
				.returning();

			if (!updated) {
				throw new Error("Failed to star file");
			}

			return updated;
		} catch (error) {
			logger.error({ msg: "Star file failed", userId, fileId, error });
			throw error;
		}
	}

	/**
	 * Unstar a file
	 */
	async unstarFile(fileId: string, userId: string) {
		logger.debug({ msg: "Unstarring file", userId, fileId });
		try {
			// Get file to ensure it exists and user has access
			await this.getFile(fileId, userId);

			// Unstar the file
			const [updated] = await this.db
				.update(files)
				.set({
					starred: false,
					updatedAt: new Date(),
				})
				.where(eq(files.id, fileId))
				.returning();

			if (!updated) {
				throw new Error("Failed to unstar file");
			}

			return updated;
		} catch (error) {
			logger.error({ msg: "Unstar file failed", userId, fileId, error });
			throw error;
		}
	}

	/**
	 * Get files and folders at a virtual path.
	 * path = "/" returns root-level content (no parent folder).
	 * path = "/docs" returns content inside the "docs" folder.
	 */
	async getContents(path: string) {
		// logger.debug({ msg: "Getting contents", path });
		// Normalize path (ensure leading slash, no trailing slash unless root)
		const normalizedPath =
			path === "/" ? "/" : path.endsWith("/") ? path.slice(0, -1) : path;
		const isRoot = normalizedPath === "/" || normalizedPath === "";

		if (isRoot) {
			const [fileList, folderList] = await Promise.all([
				this.db
					.select()
					.from(files)
					.where(and(isNull(files.folderId), eq(files.isDeleted, false)))
					.orderBy(files.name),
				this.db
					.select()
					.from(folders)
					.where(and(isNull(folders.parentId), eq(folders.isDeleted, false)))
					.orderBy(folders.name),
			]);

			return { files: fileList, folders: folderList, folder: null };
		}

		// Find the folder at the given virtual path
		const [folder] = await this.db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.virtualPath, normalizedPath),
					eq(folders.isDeleted, false),
				),
			)
			.limit(1);

		if (!folder) {
			// Path doesn't exist — return empty but maybe throw NotFound?
			// For now, return empty lists and null folder
			return { files: [], folders: [], folder: null };
		}

		const [fileList, folderList] = await Promise.all([
			this.db
				.select()
				.from(files)
				.where(and(eq(files.folderId, folder.id), eq(files.isDeleted, false)))
				.orderBy(files.name),
			this.db
				.select()
				.from(folders)
				.where(
					and(eq(folders.parentId, folder.id), eq(folders.isDeleted, false)),
				)
				.orderBy(folders.name),
		]);

		return { files: fileList, folders: folderList, folder };
	}

	/**
	 * Get starred files
	 */
	async getStarredFiles(userId: string) {
		return this.db
			.select()
			.from(files)
			.where(and(eq(files.starred, true), eq(files.isDeleted, false)))
			.orderBy(desc(files.updatedAt));
	}
}
