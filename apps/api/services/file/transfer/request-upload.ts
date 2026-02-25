import {
	ConflictError,
	joinPath,
	sanitizeFilename,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files, storageProviders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { getPublicApiBaseUrl } from "../../../config/url";
import { logger } from "../../../utils/logger";
import { ActivityService } from "../../activity";
import { FolderService } from "../../folder";
import { ProviderService } from "../../provider";
import { evaluateRules } from "../../rules";

// Request upload target and create/update file metadata.
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
	if (!name?.trim()) throw new ValidationError("File name is required");
	if (size <= 0) throw new ValidationError("File size must be greater than 0");

	try {
		const sanitizedName = sanitizeFilename(name);
		const matchedRule = await evaluateRules(db, workspaceId, {
			name: sanitizedName,
			mimeType,
			size,
		});

		if (matchedRule) {
			providerId = matchedRule.destinationProviderId;
			folderId = matchedRule.destinationFolderId ?? undefined;
		}

		let virtualPath = joinPath("/", sanitizedName);
		let remoteParentId: string | undefined;
		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			providerId,
			userId,
			workspaceId,
		);

		if (folderId) {
			const folder = await new FolderService(db).getFolder(
				folderId,
				userId,
				workspaceId,
			);
			virtualPath = joinPath(folder.virtualPath, sanitizedName);
			remoteParentId = folder.remoteId;
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
						nodeType: "file",
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

		if (!fileRecord) throw new Error("Failed to create file record");

		const proxyUrl = `${getPublicApiBaseUrl()}/api/upload/proxy?fileId=${fileRecord.id}`;
		const uploadUrl = uploadResponse.useDirectUpload
			? uploadResponse.uploadUrl
			: proxyUrl;

		await new ActivityService(db).log({
			type: "upload",
			userId,
			workspaceId,
			bytes: size,
			fileId: fileRecord.id,
			providerId,
			folderId: folderId ?? undefined,
			metadata: {
				name: sanitizedName,
				size,
				mimeType,
				useDirectUpload: uploadResponse.useDirectUpload,
			},
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
