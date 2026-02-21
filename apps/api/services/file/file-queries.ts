import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files, folders, storageProviders } from "@drivebase/db";
import { and, desc, eq, isNull, like } from "drizzle-orm";
import { logger } from "../../utils/logger";

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
 * Get files and folders at a virtual path (excludes vault files and vault folders).
 * path = "/" returns root-level content (no parent folder).
 * path = "/docs" returns content inside the "docs" folder.
 */
export async function getContents(
	db: Database,
	path: string,
	workspaceId: string,
) {
	const normalizedPath =
		path === "/" ? "/" : path.endsWith("/") ? path.slice(0, -1) : path;
	const isRoot = normalizedPath === "/" || normalizedPath === "";

	if (isRoot) {
		const [fileList, folderList] = await Promise.all([
			db
				.select({ file: files })
				.from(files)
				.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
				.where(
					and(
						isNull(files.folderId),
						eq(files.isDeleted, false),
						isNull(files.vaultId),
						eq(storageProviders.workspaceId, workspaceId),
					),
				)
				.orderBy(files.name)
				.then((rows) => rows.map((row) => row.file)),
			db
				.select()
				.from(folders)
				.where(
					and(
						isNull(folders.parentId),
						eq(folders.isDeleted, false),
						isNull(folders.vaultId),
						eq(folders.workspaceId, workspaceId),
					),
				)
				.orderBy(folders.name),
		]);

		return { files: fileList, folders: folderList, folder: null };
	}

	const [targetFolder] = await db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.virtualPath, normalizedPath),
				eq(folders.isDeleted, false),
				isNull(folders.vaultId),
				eq(folders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!targetFolder) {
		return { files: [], folders: [], folder: null };
	}

	const [fileList, folderList] = await Promise.all([
		db
			.select({ file: files })
			.from(files)
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(
				and(
					eq(files.folderId, targetFolder.id),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.orderBy(files.name)
			.then((rows) => rows.map((row) => row.file)),
		db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.parentId, targetFolder.id),
					eq(folders.isDeleted, false),
					isNull(folders.vaultId),
					eq(folders.workspaceId, workspaceId),
				),
			)
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
