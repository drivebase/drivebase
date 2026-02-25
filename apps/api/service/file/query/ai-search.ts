import type { Database } from "@drivebase/db";
import {
	fileExtractedText,
	fileTextChunks,
	files,
	storageProviders,
	workspaceAiSettings,
} from "@drivebase/db";
import { and, desc, eq, ilike, isNull, sql } from "drizzle-orm";
import { inferTextEmbedding } from "@/service/ai/inference-client";
import { logger } from "@/utils/logger";

function tokenize(input: string): string[] {
	return Array.from(
		new Set(
			input
				.toLowerCase()
				.split(/[^a-z0-9]+/g)
				.map((part) => part.trim())
				.filter((part) => part.length >= 2),
		),
	);
}

function termCoverage(text: string, terms: string[]): number {
	if (terms.length === 0) return 0;
	const haystack = text.toLowerCase();
	let hits = 0;
	for (const term of terms) {
		if (haystack.includes(term)) {
			hits += 1;
		}
	}
	return hits / terms.length;
}

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
	const queryTerms = tokenize(normalizedQuery);

	const exactRows = await db
		.select({ file: files, text: fileExtractedText.text })
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
		.limit(safeLimit * 8)
		.orderBy(desc(fileExtractedText.createdAt));

	const exactById = new Map<string, (typeof exactRows)[number]["file"]>();
	for (const row of exactRows) {
		if (!exactById.has(row.file.id)) {
			exactById.set(row.file.id, row.file);
		}
		if (exactById.size >= safeLimit) {
			break;
		}
	}
	if (exactById.size > 0) {
		return Array.from(exactById.values());
	}

	const scored = new Map<
		string,
		{
			file: typeof files.$inferSelect | (typeof exactRows)[number]["file"];
			score: number;
			semantic: number;
			lexical: number;
			name: number;
		}
	>();

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
			.limit(safeLimit * 40);

		const bestDistance = vectorRows[0]?.distance;
		const maxDistance =
			typeof bestDistance === "number"
				? Math.min(0.85, Math.max(0.35, bestDistance + 0.18))
				: 0.65;

		for (const row of vectorRows) {
			if (row.distance > maxDistance) {
				continue;
			}
			const semanticScore = Math.max(0, 1 - row.distance);
			const existing = scored.get(row.file.id);
			const base = semanticScore * 3;
			if (!existing || semanticScore > existing.semantic) {
				scored.set(row.file.id, {
					file: row.file,
					score: Math.max(existing?.score ?? 0, base),
					semantic: semanticScore,
					lexical: existing?.lexical ?? 0,
					name: existing?.name ?? 0,
				});
			}
		}
	} catch (error) {
		logger.warn({
			msg: "AI semantic search failed; continuing with lexical ranking",
			userId,
			workspaceId,
			query,
			error,
		});
	}

	const lexicalRows = await db
		.select({ file: files, text: fileExtractedText.text })
		.from(fileExtractedText)
		.innerJoin(files, eq(files.id, fileExtractedText.fileId))
		.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
		.where(
			and(
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
				isNull(files.vaultId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(safeLimit * 40)
		.orderBy(desc(fileExtractedText.createdAt));

	for (const row of lexicalRows) {
		const coverage = termCoverage(row.text, queryTerms);
		if (coverage <= 0) {
			continue;
		}
		const lexicalScore = 1.2 + coverage * 2;
		const existing = scored.get(row.file.id);
		if (!existing) {
			scored.set(row.file.id, {
				file: row.file,
				score: lexicalScore,
				semantic: 0,
				lexical: lexicalScore,
				name: 0,
			});
			continue;
		}
		existing.lexical = Math.max(existing.lexical, lexicalScore);
		existing.score = Math.max(
			existing.score,
			existing.semantic * 3 + existing.lexical,
		);
	}

	if (scored.size < safeLimit) {
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
			.limit(safeLimit * 8)
			.orderBy(files.name);

		for (const row of nameRows) {
			const coverage = termCoverage(row.file.name, queryTerms);
			const nameScore = 0.8 + coverage;
			const existing = scored.get(row.file.id);
			if (!existing) {
				scored.set(row.file.id, {
					file: row.file,
					score: nameScore,
					semantic: 0,
					lexical: 0,
					name: nameScore,
				});
				continue;
			}
			existing.name = Math.max(existing.name, nameScore);
			existing.score = Math.max(
				existing.score,
				existing.semantic * 3 + existing.lexical + existing.name * 0.5,
			);
		}
	}

	const ranked = Array.from(scored.values())
		.filter((item) => item.score > 0)
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return (
				new Date(b.file.updatedAt).getTime() -
				new Date(a.file.updatedAt).getTime()
			);
		})
		.slice(0, safeLimit)
		.map((item) => item.file);

	return ranked;
}
