import type { Database } from "@drivebase/db";
import { files, folders, type storageProviders } from "@drivebase/db";
import { and, eq, isNull, notInArray } from "drizzle-orm";
import { getProviderInstance } from "@/service/provider/query";

function normalizeNullableId(value: string | null | undefined): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}
export async function refreshSingleFolderCache(
	db: Database,
	workspaceId: string,
	userId: string,
	providerRecord: typeof storageProviders.$inferSelect,
	remoteFolderId: string | undefined,
	parentDbId: string | null,
	parentPath: string,
) {
	const provider = await getProviderInstance(providerRecord);
	const normalizedParentDbId = normalizeNullableId(parentDbId);
	try {
		const seenFolderRemoteIds: string[] = [];
		const seenFileRemoteIds: string[] = [];
		let pageToken: string | undefined;
		do {
			const listResult = await provider.list({
				folderId: remoteFolderId,
				pageToken,
				limit: 100,
			});

			for (const folder of listResult.folders) {
				const cleanName = folder.name.replace(/\//g, "-");
				const virtualPath = `${parentPath}${cleanName}/`;
				seenFolderRemoteIds.push(folder.remoteId);

				const [existingFolder] = await db
					.select()
					.from(folders)
					.where(
						and(
							eq(folders.remoteId, folder.remoteId),
							eq(folders.providerId, providerRecord.id),
							eq(folders.nodeType, "folder"),
						),
					)
					.limit(1);

				if (existingFolder) {
					await db
						.update(folders)
						.set({
							name: cleanName,
							virtualPath,
							parentId: normalizedParentDbId,
							updatedAt: folder.modifiedAt,
							isDeleted: false,
						})
						.where(eq(folders.id, existingFolder.id));
				} else {
					await db.insert(folders).values({
						nodeType: "folder",
						name: cleanName,
						virtualPath,
						remoteId: folder.remoteId,
						providerId: providerRecord.id,
						workspaceId,
						parentId: normalizedParentDbId,
						createdBy: userId,
						updatedAt: folder.modifiedAt,
						createdAt: folder.modifiedAt,
						isDeleted: false,
					});
				}
			}

			for (const file of listResult.files) {
				const cleanName = file.name.replace(/\//g, "-");
				const virtualPath = `${parentPath}${cleanName}`;
				seenFileRemoteIds.push(file.remoteId);

				const [existingFile] = await db
					.select()
					.from(files)
					.where(
						and(
							eq(files.remoteId, file.remoteId),
							eq(files.providerId, providerRecord.id),
							eq(files.nodeType, "file"),
						),
					)
					.limit(1);

				if (existingFile) {
					await db
						.update(files)
						.set({
							name: cleanName,
							virtualPath,
							mimeType: file.mimeType,
							size: file.size,
							hash: file.hash,
							folderId: normalizedParentDbId,
							updatedAt: file.modifiedAt,
							isDeleted: false,
						})
						.where(eq(files.id, existingFile.id));
					continue;
				}

				const [existingPathFile] = await db
					.select()
					.from(files)
					.where(
						and(
							eq(files.virtualPath, virtualPath),
							eq(files.providerId, providerRecord.id),
							eq(files.nodeType, "file"),
							isNull(files.vaultId),
						),
					)
					.limit(1);

				if (existingPathFile) {
					await db
						.update(files)
						.set({
							name: cleanName,
							virtualPath,
							mimeType: file.mimeType,
							size: file.size,
							hash: file.hash,
							remoteId: file.remoteId,
							folderId: normalizedParentDbId,
							uploadedBy: userId,
							updatedAt: file.modifiedAt,
							createdAt: file.modifiedAt,
							isDeleted: false,
						})
						.where(eq(files.id, existingPathFile.id));
				} else {
					await db.insert(files).values({
						nodeType: "file",
						name: cleanName,
						virtualPath,
						mimeType: file.mimeType,
						size: file.size,
						hash: file.hash,
						remoteId: file.remoteId,
						providerId: providerRecord.id,
						folderId: normalizedParentDbId,
						uploadedBy: userId,
						updatedAt: file.modifiedAt,
						createdAt: file.modifiedAt,
						isDeleted: false,
					});
				}
			}

			pageToken = listResult.nextPageToken;
		} while (pageToken);

		const fileScope = [
			eq(files.nodeType, "file"),
			eq(files.providerId, providerRecord.id),
			isNull(files.vaultId),
			normalizedParentDbId
				? eq(files.folderId, normalizedParentDbId)
				: isNull(files.folderId),
		] as const;

		await db
			.delete(files)
			.where(
				seenFileRemoteIds.length > 0
					? and(...fileScope, notInArray(files.remoteId, seenFileRemoteIds))
					: and(...fileScope),
			);

		const folderScope = [
			eq(folders.nodeType, "folder"),
			eq(folders.providerId, providerRecord.id),
			eq(folders.workspaceId, workspaceId),
			isNull(folders.vaultId),
			normalizedParentDbId
				? eq(folders.parentId, normalizedParentDbId)
				: isNull(folders.parentId),
		] as const;

		await db
			.delete(folders)
			.where(
				seenFolderRemoteIds.length > 0
					? and(
							...folderScope,
							notInArray(folders.remoteId, seenFolderRemoteIds),
						)
					: and(...folderScope),
			);
	} finally {
		await provider.cleanup();
	}
}
