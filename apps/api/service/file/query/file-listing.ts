import type { Database } from "@drivebase/db";
import {
	fileExtractedText,
	files,
	folders,
	storageProviders,
} from "@drivebase/db";
import { and, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { logger } from "../../../utils/logger";

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
		const conditions = [
			eq(files.nodeType, "file"),
			folderId ? eq(files.folderId, folderId) : isNull(files.folderId),
			eq(files.isDeleted, false),
			isNull(files.vaultId),
			eq(storageProviders.workspaceId, workspaceId),
		];

		const fileList = await db
			.select({ file: files })
			.from(files)
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(and(...conditions))
			.limit(limit)
			.offset(offset)
			.orderBy(desc(files.createdAt))
			.then((rows) => rows.map((row) => row.file));

		return {
			files: fileList,
			total: fileList.length,
			hasMore: fileList.length === limit,
		};
	} catch (error) {
		logger.error({ msg: "List files failed", userId, folderId, error });
		throw error;
	}
}

export async function searchFiles(
	db: Database,
	userId: string,
	workspaceId: string,
	query: string,
	limit: number = 50,
) {
	logger.debug({ msg: "Searching files", userId, workspaceId, query });

	try {
		return await db
			.select({ file: files })
			.from(files)
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(
				and(
					eq(files.nodeType, "file"),
					ilike(files.name, `%${query}%`),
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

export async function searchFilesAi(
	db: Database,
	userId: string,
	workspaceId: string,
	query: string,
	limit: number = 50,
) {
	logger.debug({
		msg: "Searching files with AI index",
		userId,
		workspaceId,
		query,
	});

	const normalizedQuery = query.trim();
	if (!normalizedQuery) {
		return [];
	}

	const safeLimit = Math.max(1, Math.min(limit, 100));

	try {
		const textRows = await db
			.select({ file: files })
			.from(fileExtractedText)
			.innerJoin(files, eq(files.id, fileExtractedText.fileId))
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(
				and(
					ilike(fileExtractedText.text, `%${normalizedQuery}%`),
					eq(files.nodeType, "file"),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.limit(safeLimit * 3)
			.orderBy(desc(fileExtractedText.createdAt));

		const byId = new Map<string, (typeof textRows)[number]["file"]>();
		for (const row of textRows) {
			if (!byId.has(row.file.id)) {
				byId.set(row.file.id, row.file);
			}
			if (byId.size >= safeLimit) {
				break;
			}
		}

		if (byId.size >= safeLimit) {
			return Array.from(byId.values());
		}

		const nameRows = await db
			.select({ file: files })
			.from(files)
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(
				and(
					eq(files.nodeType, "file"),
					ilike(files.name, `%${normalizedQuery}%`),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.limit(safeLimit * 2)
			.orderBy(files.name);

		for (const row of nameRows) {
			if (!byId.has(row.file.id)) {
				byId.set(row.file.id, row.file);
			}
			if (byId.size >= safeLimit) {
				break;
			}
		}

		return Array.from(byId.values());
	} catch (error) {
		logger.error({ msg: "AI search files failed", userId, query, error });
		throw error;
	}
}

export async function searchFolders(
	db: Database,
	userId: string,
	workspaceId: string,
	query: string,
	limit: number = 50,
) {
	logger.debug({ msg: "Searching folders", userId, workspaceId, query });

	try {
		return await db
			.select({ folder: folders })
			.from(folders)
			.innerJoin(storageProviders, eq(storageProviders.id, folders.providerId))
			.where(
				and(
					eq(folders.nodeType, "folder"),
					ilike(folders.name, `%${query}%`),
					eq(folders.isDeleted, false),
					isNull(folders.vaultId),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.limit(limit)
			.orderBy(folders.name)
			.then((rows) => rows.map((row) => row.folder));
	} catch (error) {
		logger.error({ msg: "Search folders failed", userId, query, error });
		throw error;
	}
}

export async function getRecentFiles(
	db: Database,
	userId: string,
	workspaceId: string,
	limit: number = 3,
) {
	logger.debug({ msg: "Listing recent files", userId, workspaceId, limit });

	try {
		return await db
			.select({ file: files })
			.from(files)
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(
				and(
					eq(files.nodeType, "file"),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.limit(limit)
			.orderBy(
				desc(sql`GREATEST(${files.updatedAt}, ${files.createdAt})`),
				desc(files.updatedAt),
				desc(files.createdAt),
			)
			.then((rows) => rows.map((row) => row.file));
	} catch (error) {
		logger.error({ msg: "List recent files failed", userId, error });
		throw error;
	}
}

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
				eq(files.nodeType, "file"),
				eq(files.starred, true),
				eq(files.isDeleted, false),
				isNull(files.vaultId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.orderBy(desc(files.updatedAt))
		.then((rows) => rows.map((row) => row.file));
}
