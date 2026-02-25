import type { Database } from "@drivebase/db";
import {
	fileExtractedText,
	files,
	fileTextChunks,
	storageProviders,
	workspaceAiSettings,
} from "@drivebase/db";
import { and, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { inferTextEmbedding } from "@/service/ai/inference-client";
import { logger } from "@/utils/logger";

export async function searchFilesAi(
	db: Database,
	userId: string,
	workspaceId: string,
	query: string,
	limit: number = 50,
) {
	logger.debug({
		msg: "Searching files with AI semantic index",
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
		const [settings] = await db
			.select({ embeddingTier: workspaceAiSettings.embeddingTier })
			.from(workspaceAiSettings)
			.where(eq(workspaceAiSettings.workspaceId, workspaceId))
			.limit(1);

		const queryEmbedding = await inferTextEmbedding({
			text: normalizedQuery,
			modelTier: settings?.embeddingTier ?? "medium",
		});
		const queryVector = `[${queryEmbedding.embedding.join(",")}]`;

		const vectorRows = await db
			.select({
				file: files,
				distance: sql<number>`${fileTextChunks.embedding} <=> ${queryVector}::vector`,
			})
			.from(fileTextChunks)
			.innerJoin(files, eq(files.id, fileTextChunks.fileId))
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(
				and(
					eq(files.nodeType, "file"),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.orderBy(
				sql`${fileTextChunks.embedding} <=> ${queryVector}::vector`,
				desc(fileTextChunks.createdAt),
			)
			.limit(safeLimit * 8);

		const semanticById = new Map<string, (typeof vectorRows)[number]["file"]>();
		for (const row of vectorRows) {
			if (!semanticById.has(row.file.id)) {
				semanticById.set(row.file.id, row.file);
			}
			if (semanticById.size >= safeLimit) {
				break;
			}
		}

		if (semanticById.size >= safeLimit) {
			return Array.from(semanticById.values());
		}

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

		const byId = new Map<string, (typeof textRows)[number]["file"]>(
			semanticById.entries(),
		);
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
		logger.warn({
			msg: "AI semantic search failed; falling back to text+name search",
			userId,
			workspaceId,
			query,
			error,
		});

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
				return Array.from(byId.values());
			}
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
	}
}
