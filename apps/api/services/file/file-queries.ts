import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { files, folders } from "@drivebase/db";
import { and, desc, eq, isNull, like } from "drizzle-orm";
import { logger } from "../../utils/logger";

/**
 * Get file by ID
 */
export async function getFile(db: Database, fileId: string, _userId: string) {
	const [file] = await db
		.select()
		.from(files)
		.where(and(eq(files.id, fileId), eq(files.isDeleted, false)))
		.limit(1);

	if (!file) {
		throw new NotFoundError("File");
	}

	return file;
}

/**
 * List files in a folder
 */
export async function listFiles(
	db: Database,
	userId: string,
	folderId?: string,
	limit: number = 50,
	offset: number = 0,
) {
	logger.debug({ msg: "Listing files", userId, folderId, limit, offset });

	try {
		const fileList = folderId
			? await db
					.select()
					.from(files)
					.where(and(eq(files.folderId, folderId), eq(files.isDeleted, false)))
					.limit(limit)
					.offset(offset)
					.orderBy(desc(files.createdAt))
			: await db
					.select()
					.from(files)
					.where(and(isNull(files.folderId), eq(files.isDeleted, false)))
					.limit(limit)
					.offset(offset)
					.orderBy(desc(files.createdAt));

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
export async function searchFiles(
	db: Database,
	userId: string,
	query: string,
	limit: number = 50,
) {
	logger.debug({ msg: "Searching files", userId, query });
	const searchPattern = `%${query}%`;

	try {
		return await db
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
 * Get files and folders at a virtual path.
 * path = "/" returns root-level content (no parent folder).
 * path = "/docs" returns content inside the "docs" folder.
 */
export async function getContents(db: Database, path: string) {
	const normalizedPath =
		path === "/" ? "/" : path.endsWith("/") ? path.slice(0, -1) : path;
	const isRoot = normalizedPath === "/" || normalizedPath === "";

	if (isRoot) {
		const [fileList, folderList] = await Promise.all([
			db
				.select()
				.from(files)
				.where(and(isNull(files.folderId), eq(files.isDeleted, false)))
				.orderBy(files.name),
			db
				.select()
				.from(folders)
				.where(and(isNull(folders.parentId), eq(folders.isDeleted, false)))
				.orderBy(folders.name),
		]);

		return { files: fileList, folders: folderList, folder: null };
	}

	const [folder] = await db
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
		return { files: [], folders: [], folder: null };
	}

	const [fileList, folderList] = await Promise.all([
		db
			.select()
			.from(files)
			.where(and(eq(files.folderId, folder.id), eq(files.isDeleted, false)))
			.orderBy(files.name),
		db
			.select()
			.from(folders)
			.where(and(eq(folders.parentId, folder.id), eq(folders.isDeleted, false)))
			.orderBy(folders.name),
	]);

	return { files: fileList, folders: folderList, folder };
}

/**
 * Get starred files
 */
export async function getStarredFiles(db: Database, _userId: string) {
	return db
		.select()
		.from(files)
		.where(and(eq(files.starred, true), eq(files.isDeleted, false)))
		.orderBy(desc(files.updatedAt));
}
