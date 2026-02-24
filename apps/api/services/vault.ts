import {
	ConflictError,
	joinPath,
	NotFoundError,
	sanitizeFilename,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files, folders, vaults } from "@drivebase/db";
import { and, eq, isNull } from "drizzle-orm";
import { getPublicApiBaseUrl } from "../config/url";
import { telemetry } from "../telemetry";
import { logger } from "../utils/logger";
import { ProviderService } from "./provider";

/**
 * VaultService — manages E2EE vault per user.
 * Key material (publicKey, encryptedPrivateKey, kekSalt) is always
 * provided by the client. The server never sees plaintext.
 */
export class VaultService {
	constructor(private db: Database) {}

	/**
	 * Get the current user's vault, or null if not set up.
	 */
	async getVault(userId: string) {
		const [vault] = await this.db
			.select()
			.from(vaults)
			.where(eq(vaults.userId, userId))
			.limit(1);
		return vault ?? null;
	}

	/**
	 * Create a new vault for the user. Throws ConflictError if one already exists.
	 */
	async setupVault(
		userId: string,
		publicKey: string,
		encryptedPrivateKey: string,
		kekSalt: string,
	) {
		const existing = await this.getVault(userId);
		if (existing) {
			throw new ConflictError("Vault already exists for this user");
		}

		const [vault] = await this.db
			.insert(vaults)
			.values({ userId, publicKey, encryptedPrivateKey, kekSalt })
			.returning();

		if (!vault) {
			throw new Error("Failed to create vault");
		}

		logger.info({ msg: "Vault created", userId, vaultId: vault.id });
		telemetry.capture("vault_setup");
		return vault;
	}

	/**
	 * Update the encrypted private key and salt (passphrase change).
	 */
	async changePassphrase(
		userId: string,
		encryptedPrivateKey: string,
		kekSalt: string,
	) {
		const vault = await this.requireVault(userId);

		const [updated] = await this.db
			.update(vaults)
			.set({ encryptedPrivateKey, kekSalt, updatedAt: new Date() })
			.where(eq(vaults.id, vault.id))
			.returning();

		if (!updated) {
			throw new Error("Failed to update vault");
		}

		return updated;
	}

	/**
	 * Get files and folders inside the vault at a given location.
	 */
	async getVaultContents(userId: string, folderId?: string) {
		const vault = await this.requireVault(userId);

		if (!folderId) {
			const [fileList, folderList] = await Promise.all([
				this.db
					.select()
					.from(files)
					.where(
						and(
							eq(files.nodeType, "file"),
							eq(files.vaultId, vault.id),
							isNull(files.folderId),
							eq(files.isDeleted, false),
						),
					)
					.orderBy(files.name),
				this.db
					.select()
					.from(folders)
					.where(
						and(
							eq(folders.nodeType, "folder"),
							eq(folders.vaultId, vault.id),
							isNull(folders.parentId),
							eq(folders.isDeleted, false),
						),
					)
					.orderBy(folders.name),
			]);

			return { files: fileList, folders: folderList, folder: null };
		}

		const [targetFolder] = await this.db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.id, folderId),
					eq(folders.nodeType, "folder"),
					eq(folders.vaultId, vault.id),
					eq(folders.isDeleted, false),
				),
			)
			.limit(1);

		if (!targetFolder) {
			return { files: [], folders: [], folder: null };
		}

		const [fileList, folderList] = await Promise.all([
			this.db
				.select()
				.from(files)
				.where(
					and(
						eq(files.nodeType, "file"),
						eq(files.vaultId, vault.id),
						eq(files.folderId, targetFolder.id),
						eq(files.isDeleted, false),
					),
				)
				.orderBy(files.name),
			this.db
				.select()
				.from(folders)
				.where(
					and(
						eq(folders.nodeType, "folder"),
						eq(folders.vaultId, vault.id),
						eq(folders.parentId, targetFolder.id),
						eq(folders.isDeleted, false),
					),
				)
				.orderBy(folders.name),
		]);

		return { files: fileList, folders: folderList, folder: targetFolder };
	}

	/**
	 * Request an upload slot for a vault file.
	 * Returns upload URL/fields and creates the file record with encryption metadata.
	 */
	async requestVaultUpload(
		userId: string,
		workspaceId: string,
		name: string,
		mimeType: string,
		size: number,
		folderId: string | undefined,
		providerId: string,
		encryptedFileKey: string,
	) {
		if (!name || name.trim().length === 0) {
			throw new ValidationError("File name is required");
		}
		if (size <= 0) {
			throw new ValidationError("File size must be greater than 0");
		}

		const vault = await this.requireVault(userId);
		const sanitizedName = sanitizeFilename(name);

		const vaultRoot = `/vault/${userId}`;
		let virtualPath: string;

		if (folderId) {
			const [folder] = await this.db
				.select()
				.from(folders)
				.where(
					and(
						eq(folders.id, folderId),
						eq(folders.nodeType, "folder"),
						eq(folders.vaultId, vault.id),
						eq(folders.isDeleted, false),
					),
				)
				.limit(1);

			if (!folder) {
				throw new NotFoundError("Folder");
			}

			virtualPath = joinPath(folder.virtualPath, sanitizedName);
		} else {
			virtualPath = joinPath(vaultRoot, sanitizedName);
		}

		// Check for existing file at path
		const [existing] = await this.db
			.select()
			.from(files)
			.where(
				and(eq(files.virtualPath, virtualPath), eq(files.nodeType, "file")),
			)
			.limit(1);

		if (existing && !existing.isDeleted) {
			throw new ConflictError(`File already exists at path: ${virtualPath}`);
		}

		const providerService = new ProviderService(this.db);
		const providerRecord = await providerService.getProvider(
			providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		const uploadResponse = await provider.requestUpload({
			name: sanitizedName,
			mimeType,
			size,
			parentId: undefined,
		});

		await provider.cleanup();

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
						vaultId: vault.id,
						isEncrypted: true,
						encryptedFileKey,
						isDeleted: false,
						updatedAt: new Date(),
					})
					.where(eq(files.id, existing.id))
					.returning()
			: await this.db
					.insert(files)
					.values({
						nodeType: "file",
						virtualPath,
						name: sanitizedName,
						mimeType,
						size,
						remoteId: uploadResponse.fileId,
						providerId,
						folderId: folderId ?? null,
						uploadedBy: userId,
						vaultId: vault.id,
						isEncrypted: true,
						encryptedFileKey,
					})
					.returning();

		if (!fileRecord) {
			throw new Error("Failed to create vault file record");
		}

		const baseUrl = getPublicApiBaseUrl();
		const proxyUrl = `${baseUrl}/api/upload/proxy?fileId=${fileRecord.id}`;
		const uploadUrl = uploadResponse.useDirectUpload
			? uploadResponse.uploadUrl
			: proxyUrl;

		return {
			fileId: fileRecord.id,
			uploadUrl,
			uploadFields: uploadResponse.uploadFields,
			useDirectUpload: uploadResponse.useDirectUpload,
		};
	}

	/**
	 * Request a download URL for a vault file plus its encrypted file key.
	 */
	async requestVaultDownload(
		userId: string,
		workspaceId: string,
		fileId: string,
	) {
		const vault = await this.requireVault(userId);

		const [file] = await this.db
			.select()
			.from(files)
			.where(
				and(
					eq(files.id, fileId),
					eq(files.nodeType, "file"),
					eq(files.vaultId, vault.id),
					eq(files.isDeleted, false),
				),
			)
			.limit(1);

		if (!file) {
			throw new NotFoundError("File");
		}

		if (!file.encryptedFileKey) {
			throw new ValidationError("File is missing encryption key");
		}

		// Vault downloads should always go through our proxy so auth + CORS are handled
		// uniformly before client-side decryption.
		await new ProviderService(this.db).getProvider(
			file.providerId,
			userId,
			workspaceId,
		);

		const baseUrl = getPublicApiBaseUrl();
		const proxyUrl = `${baseUrl}/api/download/proxy?fileId=${file.id}`;

		return {
			fileId: file.id,
			downloadUrl: proxyUrl,
			useDirectDownload: false,
			encryptedFileKey: file.encryptedFileKey,
		};
	}

	/**
	 * Create a folder inside the vault.
	 * Vault folders are virtual (not backed by a real provider folder),
	 * so we use a synthetic remoteId and require a providerId for storage.
	 */
	async createVaultFolder(
		userId: string,
		workspaceId: string,
		name: string,
		providerId: string,
		parentId?: string,
	) {
		const vault = await this.requireVault(userId);

		if (!name || name.trim().length === 0) {
			throw new ValidationError("Folder name is required");
		}

		const sanitizedName = name.trim().replace(/[/\\]/g, "_");
		const vaultRoot = `/vault/${userId}`;

		let virtualPath: string;

		if (parentId) {
			const [parent] = await this.db
				.select()
				.from(folders)
				.where(
					and(
						eq(folders.id, parentId),
						eq(folders.nodeType, "folder"),
						eq(folders.vaultId, vault.id),
						eq(folders.isDeleted, false),
					),
				)
				.limit(1);

			if (!parent) {
				throw new NotFoundError("Parent folder");
			}

			virtualPath = joinPath(parent.virtualPath, sanitizedName);
		} else {
			virtualPath = joinPath(vaultRoot, sanitizedName);
		}

		// Vault folders use a synthetic remoteId since they're not real provider folders
		const syntheticRemoteId = `vault:${crypto.randomUUID()}`;

		const [folder] = await this.db
			.insert(folders)
			.values({
				nodeType: "folder",
				virtualPath,
				name: sanitizedName,
				remoteId: syntheticRemoteId,
				providerId,
				workspaceId,
				parentId: parentId ?? null,
				createdBy: userId,
				vaultId: vault.id,
				isDeleted: false,
			})
			.returning();

		if (!folder) {
			throw new Error("Failed to create vault folder");
		}

		return folder;
	}

	/**
	 * Soft-delete a vault file.
	 */
	async deleteVaultFile(userId: string, fileId: string) {
		const vault = await this.requireVault(userId);

		const [file] = await this.db
			.select()
			.from(files)
			.where(
				and(
					eq(files.id, fileId),
					eq(files.nodeType, "file"),
					eq(files.vaultId, vault.id),
					eq(files.isDeleted, false),
				),
			)
			.limit(1);

		if (!file) {
			throw new NotFoundError("File");
		}

		await this.db
			.update(files)
			.set({ isDeleted: true, updatedAt: new Date() })
			.where(eq(files.id, fileId));
	}

	/**
	 * Rename a vault file.
	 */
	async renameVaultFile(userId: string, fileId: string, newName: string) {
		const vault = await this.requireVault(userId);

		const [file] = await this.db
			.select()
			.from(files)
			.where(
				and(
					eq(files.id, fileId),
					eq(files.nodeType, "file"),
					eq(files.vaultId, vault.id),
					eq(files.isDeleted, false),
				),
			)
			.limit(1);

		if (!file) {
			throw new NotFoundError("File");
		}

		const sanitizedName = sanitizeFilename(newName);
		const parentPath = file.virtualPath.substring(
			0,
			file.virtualPath.lastIndexOf("/"),
		);
		const newVirtualPath = joinPath(
			parentPath || `/vault/${userId}`,
			sanitizedName,
		);

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
			throw new Error("Failed to rename vault file");
		}

		return updated;
	}

	/**
	 * Star a vault file.
	 */
	async starVaultFile(userId: string, fileId: string) {
		const vault = await this.requireVault(userId);
		return this.setVaultFileStar(vault.id, fileId, true);
	}

	/**
	 * Unstar a vault file.
	 */
	async unstarVaultFile(userId: string, fileId: string) {
		const vault = await this.requireVault(userId);
		return this.setVaultFileStar(vault.id, fileId, false);
	}

	/**
	 * Prepare a vault file record for chunked upload.
	 * Returns the file record — session creation is handled by the caller.
	 */
	async prepareVaultChunkedUpload(
		userId: string,
		workspaceId: string,
		name: string,
		mimeType: string,
		totalSize: number,
		folderId: string | undefined,
		providerId: string,
		encryptedFileKey: string,
		encryptedChunkSize?: number,
	) {
		if (!name || name.trim().length === 0) {
			throw new ValidationError("File name is required");
		}

		const vault = await this.requireVault(userId);
		const sanitizedName = sanitizeFilename(name);
		const vaultRoot = `/vault/${userId}`;

		let virtualPath: string;

		if (folderId) {
			const [folder] = await this.db
				.select()
				.from(folders)
				.where(
					and(
						eq(folders.id, folderId),
						eq(folders.nodeType, "folder"),
						eq(folders.vaultId, vault.id),
						eq(folders.isDeleted, false),
					),
				)
				.limit(1);

			if (!folder) {
				throw new NotFoundError("Folder");
			}

			virtualPath = joinPath(folder.virtualPath, sanitizedName);
		} else {
			virtualPath = joinPath(vaultRoot, sanitizedName);
		}

		const [existing] = await this.db
			.select()
			.from(files)
			.where(
				and(eq(files.virtualPath, virtualPath), eq(files.nodeType, "file")),
			)
			.limit(1);

		if (existing && !existing.isDeleted) {
			throw new ConflictError(`File already exists at path: ${virtualPath}`);
		}

		const providerService = new ProviderService(this.db);
		const providerRecord = await providerService.getProvider(
			providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		const uploadResponse = await provider.requestUpload({
			name: sanitizedName,
			mimeType,
			size: totalSize,
			parentId: undefined,
		});

		await provider.cleanup();

		const [fileRecord] = existing
			? await this.db
					.update(files)
					.set({
						name: sanitizedName,
						mimeType,
						size: totalSize,
						remoteId: uploadResponse.fileId,
						providerId,
						folderId: folderId ?? null,
						uploadedBy: userId,
						vaultId: vault.id,
						isEncrypted: true,
						encryptedFileKey,
						encryptedChunkSize: encryptedChunkSize ?? null,
						isDeleted: false,
						updatedAt: new Date(),
					})
					.where(eq(files.id, existing.id))
					.returning()
			: await this.db
					.insert(files)
					.values({
						nodeType: "file",
						virtualPath,
						name: sanitizedName,
						mimeType,
						size: totalSize,
						remoteId: uploadResponse.fileId,
						providerId,
						folderId: folderId ?? null,
						uploadedBy: userId,
						vaultId: vault.id,
						isEncrypted: true,
						encryptedFileKey,
						encryptedChunkSize: encryptedChunkSize ?? null,
					})
					.returning();

		if (!fileRecord) {
			throw new Error("Failed to create vault file record");
		}

		return { file: fileRecord, providerRecord };
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	private async requireVault(userId: string) {
		const vault = await this.getVault(userId);
		if (!vault) {
			throw new NotFoundError("Vault");
		}
		return vault;
	}

	private async setVaultFileStar(
		vaultId: string,
		fileId: string,
		starred: boolean,
	) {
		const [file] = await this.db
			.select()
			.from(files)
			.where(
				and(
					eq(files.id, fileId),
					eq(files.nodeType, "file"),
					eq(files.vaultId, vaultId),
					eq(files.isDeleted, false),
				),
			)
			.limit(1);

		if (!file) {
			throw new NotFoundError("File");
		}

		const [updated] = await this.db
			.update(files)
			.set({ starred, updatedAt: new Date() })
			.where(eq(files.id, fileId))
			.returning();

		if (!updated) {
			throw new Error("Failed to update file star");
		}

		return updated;
	}
}
