import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files, folders, storageProviders } from "@drivebase/db";
import { and, desc, eq, inArray, isNull, like, notInArray } from "drizzle-orm";
import { getProviderInstance } from "../provider/provider-queries";
import { logger } from "../../utils/logger";

function normalizeNullableId(value: string | null | undefined): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

async function refreshSingleFolderCache(
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
				} else {
					const [existingPathFile] = await db
						.select()
						.from(files)
						.where(
							and(
								eq(files.virtualPath, virtualPath),
								eq(files.providerId, providerRecord.id),
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
			}

			pageToken = listResult.nextPageToken;
		} while (pageToken);

		const fileScope = [
			eq(files.providerId, providerRecord.id),
			isNull(files.vaultId),
			normalizedParentDbId
				? eq(files.folderId, normalizedParentDbId)
				: isNull(files.folderId),
		] as const;

		if (seenFileRemoteIds.length > 0) {
			await db
				.delete(files)
				.where(
					and(...fileScope, notInArray(files.remoteId, seenFileRemoteIds)),
				);
		} else {
			await db.delete(files).where(and(...fileScope));
		}

		const folderScope = [
			eq(folders.providerId, providerRecord.id),
			eq(folders.workspaceId, workspaceId),
			isNull(folders.vaultId),
			normalizedParentDbId
				? eq(folders.parentId, normalizedParentDbId)
				: isNull(folders.parentId),
		] as const;

		if (seenFolderRemoteIds.length > 0) {
			await db
				.delete(folders)
				.where(
					and(
						...folderScope,
						notInArray(folders.remoteId, seenFolderRemoteIds),
					),
				);
		} else {
			await db.delete(folders).where(and(...folderScope));
		}
	} finally {
		await provider.cleanup();
	}
}

async function hasCachedRootItemsForProvider(
	db: Database,
	workspaceId: string,
	providerId: string,
) {
	const [rootFiles, rootFolders] = await Promise.all([
		db
			.select({ id: files.id })
			.from(files)
			.where(
				and(
					eq(files.providerId, providerId),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
					isNull(files.folderId),
				),
			)
			.limit(1),
		db
			.select({ id: folders.id })
			.from(folders)
			.where(
				and(
					eq(folders.providerId, providerId),
					eq(folders.workspaceId, workspaceId),
					eq(folders.isDeleted, false),
					isNull(folders.vaultId),
					isNull(folders.parentId),
				),
			)
			.limit(1),
	]);

	return rootFiles.length > 0 || rootFolders.length > 0;
}

async function hasCachedChildrenForFolder(
	db: Database,
	workspaceId: string,
	providerId: string,
	folderId: string,
) {
	const [childFiles, childFolders] = await Promise.all([
		db
			.select({ id: files.id })
			.from(files)
			.where(
				and(
					eq(files.providerId, providerId),
					eq(files.folderId, folderId),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
				),
			)
			.limit(1),
		db
			.select({ id: folders.id })
			.from(folders)
			.where(
				and(
					eq(folders.providerId, providerId),
					eq(folders.workspaceId, workspaceId),
					eq(folders.parentId, folderId),
					eq(folders.isDeleted, false),
					isNull(folders.vaultId),
				),
			)
			.limit(1),
	]);

	return childFiles.length > 0 || childFolders.length > 0;
}

/**
 * Get file by ID (excludes vault files)
 */
export async function getFile(
	db: Database,
	fileId: string,
	_userId: string,
	workspaceId: string,
) {
	const [file] = await db
		.select()
		.from(files)
		.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
		.where(
			and(
				eq(files.id, fileId),
				eq(files.isDeleted, false),
				isNull(files.vaultId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!file?.files) {
		throw new NotFoundError("File");
	}

	return file.files;
}

/**
 * Get file by ID for proxy upload/download — includes vault files.
 * Used by the upload/download proxy handlers which serve both regular and vault files.
 */
export async function getFileForProxy(
	db: Database,
	fileId: string,
	workspaceId: string,
) {
	const [file] = await db
		.select()
		.from(files)
		.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
		.where(
			and(
				eq(files.id, fileId),
				eq(files.isDeleted, false),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!file?.files) {
		throw new NotFoundError("File");
	}

	return file.files;
}

/**
 * List files in a folder (excludes vault files)
 */
export async function listFiles(
	db: Database,
	userId: string,
	workspaceId: string,
	folderId?: string,
	limit: number = 50,
	offset: number = 0,
) {
	logger.debug({
		msg: "Listing files",
		userId,
		workspaceId,
		folderId,
		limit,
		offset,
	});

	try {
		const fileList = folderId
			? await db
					.select({ file: files })
					.from(files)
					.innerJoin(
						storageProviders,
						eq(storageProviders.id, files.providerId),
					)
					.where(
						and(
							eq(files.folderId, folderId),
							eq(files.isDeleted, false),
							isNull(files.vaultId),
							eq(storageProviders.workspaceId, workspaceId),
						),
					)
					.limit(limit)
					.offset(offset)
					.orderBy(desc(files.createdAt))
					.then((rows) => rows.map((row) => row.file))
			: await db
					.select({ file: files })
					.from(files)
					.innerJoin(
						storageProviders,
						eq(storageProviders.id, files.providerId),
					)
					.where(
						and(
							isNull(files.folderId),
							eq(files.isDeleted, false),
							isNull(files.vaultId),
							eq(storageProviders.workspaceId, workspaceId),
						),
					)
					.limit(limit)
					.offset(offset)
					.orderBy(desc(files.createdAt))
					.then((rows) => rows.map((row) => row.file));

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
 * Search files by name (excludes vault files)
 */
export async function searchFiles(
	db: Database,
	userId: string,
	workspaceId: string,
	query: string,
	limit: number = 50,
) {
	logger.debug({ msg: "Searching files", userId, workspaceId, query });
	const searchPattern = `%${query}%`;

	try {
		return await db
			.select({ file: files })
			.from(files)
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(
				and(
					like(files.name, searchPattern),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.limit(limit)
			.orderBy(files.name)
			.then((rows) => rows.map((row) => row.file));
	} catch (error) {
		logger.error({ msg: "Search files failed", userId, query, error });
		throw error;
	}
}

/**
 * Get files and folders at a location (excludes vault files and vault folders).
 * folderId = undefined returns root-level content.
 * providerIds filters results to specific providers.
 */
export async function getContents(
	db: Database,
	workspaceId: string,
	userId: string,
	folderId?: string,
	providerIds?: string[],
) {
	const isRoot = !folderId;

	if (isRoot) {
		const providerConditions = [
			eq(storageProviders.workspaceId, workspaceId),
			eq(storageProviders.isActive, true),
		];

		if (providerIds && providerIds.length > 0) {
			providerConditions.push(inArray(storageProviders.id, providerIds));
		}

		const providerRecords = await db
			.select()
			.from(storageProviders)
			.where(and(...providerConditions));

		await Promise.all(
			providerRecords.map(async (providerRecord) => {
				const hasCached = await hasCachedRootItemsForProvider(
					db,
					workspaceId,
					providerRecord.id,
				);

				if (hasCached) {
					return;
				}

				await refreshSingleFolderCache(
					db,
					workspaceId,
					userId,
					providerRecord,
					undefined,
					null,
					"/",
				);
			}),
		);
	}

	if (isRoot) {
		const fileConditions = [
			isNull(files.folderId),
			eq(files.isDeleted, false),
			isNull(files.vaultId),
			eq(storageProviders.workspaceId, workspaceId),
		];
		if (providerIds && providerIds.length > 0) {
			fileConditions.push(inArray(files.providerId, providerIds));
		}

		const folderConditions = [
			isNull(folders.parentId),
			eq(folders.isDeleted, false),
			isNull(folders.vaultId),
			eq(folders.workspaceId, workspaceId),
		];
		if (providerIds && providerIds.length > 0) {
			folderConditions.push(inArray(folders.providerId, providerIds));
		}

		const [fileList, folderList] = await Promise.all([
			db
				.select({ file: files })
				.from(files)
				.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
				.where(and(...fileConditions))
				.orderBy(files.name)
				.then((rows) => rows.map((row) => row.file)),
			db
				.select()
				.from(folders)
				.where(and(...folderConditions))
				.orderBy(folders.name),
		]);

		return { files: fileList, folders: folderList, folder: null };
	}

	const [targetFolder] = await db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.id, folderId),
				eq(folders.isDeleted, false),
				isNull(folders.vaultId),
				eq(folders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!targetFolder) {
		return { files: [], folders: [], folder: null };
	}

	if (!providerIds || providerIds.includes(targetFolder.providerId)) {
		const [providerRecord] = await db
			.select()
			.from(storageProviders)
			.where(
				and(
					eq(storageProviders.id, targetFolder.providerId),
					eq(storageProviders.workspaceId, workspaceId),
					eq(storageProviders.isActive, true),
				),
			)
			.limit(1);

		if (providerRecord) {
			const hasCachedChildren = await hasCachedChildrenForFolder(
				db,
				workspaceId,
				providerRecord.id,
				targetFolder.id,
			);

			if (!hasCachedChildren) {
				await refreshSingleFolderCache(
					db,
					workspaceId,
					userId,
					providerRecord,
					targetFolder.remoteId,
					targetFolder.id,
					targetFolder.virtualPath,
				);
			}
		}
	}

	const fileConditions = [
		eq(files.folderId, targetFolder.id),
		eq(files.isDeleted, false),
		isNull(files.vaultId),
		eq(storageProviders.workspaceId, workspaceId),
	];
	if (providerIds && providerIds.length > 0) {
		fileConditions.push(inArray(files.providerId, providerIds));
	}

	const folderConditions = [
		eq(folders.parentId, targetFolder.id),
		eq(folders.isDeleted, false),
		isNull(folders.vaultId),
		eq(folders.workspaceId, workspaceId),
	];
	if (providerIds && providerIds.length > 0) {
		folderConditions.push(inArray(folders.providerId, providerIds));
	}

	const [fileList, folderList] = await Promise.all([
		db
			.select({ file: files })
			.from(files)
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(and(...fileConditions))
			.orderBy(files.name)
			.then((rows) => rows.map((row) => row.file)),
		db
			.select()
			.from(folders)
			.where(and(...folderConditions))
			.orderBy(folders.name),
	]);

	return { files: fileList, folders: folderList, folder: targetFolder };
}

/**
 * Get starred files (excludes vault files)
 */
export async function getStarredFiles(
	db: Database,
	_userId: string,
	workspaceId: string,
) {
	return db
		.select({ file: files })
		.from(files)
		.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
		.where(
			and(
				eq(files.starred, true),
				eq(files.isDeleted, false),
				isNull(files.vaultId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.orderBy(desc(files.updatedAt))
		.then((rows) => rows.map((row) => row.file));
}
