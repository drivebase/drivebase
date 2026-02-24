import {
	ConflictError,
	joinPath,
	sanitizeFilename,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files, storageProviders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { getTransferQueue } from "../../queue/transfer-queue";
import { getPublicApiBaseUrl } from "../../config/url";
import { logger } from "../../utils/logger";
import { ActivityService } from "../activity";
import { FolderService } from "../folder";
import { ProviderService } from "../provider";
import { evaluateRules } from "../rules";
import { getFile, getFileForProxy } from "./file-queries";

/**
 * Request file upload
 * Returns upload information (URL or file ID for direct upload)
 */
export async function requestUpload(
	db: Database,
	userId: string,
	workspaceId: string,
	name: string,
	mimeType: string,
	size: number,
	folderId: string | undefined,
	providerId: string,
) {
	logger.debug({ msg: "Requesting upload", userId, name, size, providerId });
	if (!name || name.trim().length === 0) {
		throw new ValidationError("File name is required");
	}

	if (size <= 0) {
		throw new ValidationError("File size must be greater than 0");
	}

	try {
		const sanitizedName = sanitizeFilename(name);

		// Evaluate file placement rules — may override provider/folder
		const matchedRule = await evaluateRules(db, workspaceId, {
			name: sanitizedName,
			mimeType,
			size,
		});

		if (matchedRule) {
			logger.debug({
				msg: "File placement rule matched",
				ruleId: matchedRule.id,
				ruleName: matchedRule.name,
				originalProviderId: providerId,
				newProviderId: matchedRule.destinationProviderId,
			});
			providerId = matchedRule.destinationProviderId;
			folderId = matchedRule.destinationFolderId ?? undefined;
		}

		let folder = null;
		let virtualPath: string;
		let remoteParentId: string | undefined;

		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			providerId,
			userId,
			workspaceId,
		);

		if (folderId) {
			const folderService = new FolderService(db);
			folder = await folderService.getFolder(folderId, userId, workspaceId);
			virtualPath = joinPath(folder.virtualPath, sanitizedName);
			remoteParentId = folder.remoteId;
		} else {
			virtualPath = joinPath("/", sanitizedName);
			remoteParentId = undefined;
		}

		const [existing] = await db
			.select({ id: files.id, isDeleted: files.isDeleted })
			.from(files)
			.innerJoin(storageProviders, eq(files.providerId, storageProviders.id))
			.where(
				and(
					eq(files.virtualPath, virtualPath),
					eq(files.providerId, providerId),
				),
			)
			.limit(1);

		if (existing && !existing.isDeleted) {
			throw new ConflictError(`File already exists at path: ${virtualPath}`);
		}

		const provider = await providerService.getProviderInstance(providerRecord);

		const uploadResponse = await provider.requestUpload({
			name: sanitizedName,
			mimeType,
			size,
			parentId: remoteParentId,
		});

		await provider.cleanup();

		const [fileRecord] = existing
			? await db
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
			: await db
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

		const baseUrl = getPublicApiBaseUrl();
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
 * Request file download
 */
export async function requestDownload(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
) {
	logger.debug({ msg: "Requesting download", userId, fileId });

	try {
		const file = await getFile(db, fileId, userId, workspaceId);

		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		const downloadResponse = await provider.requestDownload({
			remoteId: file.remoteId,
		});

		await provider.cleanup();

		const baseUrl = getPublicApiBaseUrl();
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
export async function downloadFile(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
): Promise<ReadableStream> {
	logger.debug({ msg: "Downloading file stream", userId, fileId });
	try {
		const file = await getFile(db, fileId, userId, workspaceId);

		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		const stream = await provider.downloadFile(file.remoteId);

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
 * Download file stream for proxy handler — includes vault files.
 */
export async function downloadFileForProxy(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
): Promise<ReadableStream> {
	logger.debug({ msg: "Downloading file stream (proxy)", userId, fileId });
	try {
		const file = await getFileForProxy(db, fileId, workspaceId);

		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		const stream = await provider.downloadFile(file.remoteId);

		return stream;
	} catch (error) {
		logger.error({
			msg: "Download file stream (proxy) failed",
			userId,
			fileId,
			error,
		});
		throw error;
	}
}

/**
 * Get file metadata
 */
export async function getFileMetadata(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
) {
	logger.debug({ msg: "Getting file metadata", userId, fileId });

	try {
		const file = await getFile(db, fileId, userId, workspaceId);

		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

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
 * Move file to a different storage provider.
 * Enqueues a background transfer job and returns immediately.
 */
export async function moveFileToProvider(
	db: Database,
	fileId: string,
	userId: string,
	targetProviderId: string,
	workspaceId: string,
) {
	logger.debug({
		msg: "Moving file to provider",
		userId,
		fileId,
		targetProviderId,
	});

	const file = await getFile(db, fileId, userId, workspaceId);

	if (file.providerId === targetProviderId) {
		throw new ValidationError("File is already on this provider");
	}

	const providerService = new ProviderService(db);
	await providerService.getProvider(file.providerId, userId, workspaceId);
	await providerService.getProvider(targetProviderId, userId, workspaceId);

	try {
		const activityService = new ActivityService(db);
		const activityJob = await activityService.create(workspaceId, {
			type: "provider_transfer",
			title: `Transfer ${file.name}`,
			message: "Queued for transfer",
			metadata: {
				fileId: file.id,
				fileName: file.name,
				sourceProviderId: file.providerId,
				targetProviderId,
				totalSize: file.size,
				phase: "queued",
			},
		});

		const transferQueue = getTransferQueue();
		await transferQueue.add(
			"move-file-to-provider",
			{
				jobId: activityJob.id,
				workspaceId,
				userId,
				fileId: file.id,
				targetProviderId,
			},
			{
				jobId: `file-transfer:${file.id}:${targetProviderId}`,
			},
		);

		logger.info({
			msg: "Queued file transfer job",
			fileId,
			activityJobId: activityJob.id,
			from: file.providerId,
			to: targetProviderId,
		});

		return file;
	} catch (error) {
		logger.error({
			msg: "Queue file transfer failed",
			userId,
			fileId,
			targetProviderId,
			error,
		});
		throw error;
	}
}
