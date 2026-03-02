import type { Database } from "@drivebase/db";
import { fileContents, files } from "@drivebase/db";
import { and, eq, sql } from "drizzle-orm";

export type SmartSearchResult = {
	file: typeof files.$inferSelect;
	headline: string;
	rank: number;
};

/**
 * Full-text search on extracted file contents using PostgreSQL tsvector.
 */
export async function smartSearch(
	db: Database,
	workspaceId: string,
	query: string,
	limit = 20,
): Promise<SmartSearchResult[]> {
	const tsQuery = query
		.trim()
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => `${word}:*`)
		.join(" & ");

	if (!tsQuery) return [];

	const results = await db
		.select({
			file: files,
			headline: sql<string>`ts_headline('english', ${fileContents.extractedText}, to_tsquery('english', ${tsQuery}), 'MaxWords=35, MinWords=15, StartSel=<<, StopSel=>>')`,
			rank: sql<number>`ts_rank(${fileContents.searchVector}, to_tsquery('english', ${tsQuery}))`,
		})
		.from(fileContents)
		.innerJoin(files, eq(fileContents.nodeId, files.id))
		.where(
			and(
				eq(fileContents.workspaceId, workspaceId),
				eq(fileContents.extractionStatus, "completed"),
				eq(files.isDeleted, false),
				sql`${fileContents.searchVector} @@ to_tsquery('english', ${tsQuery})`,
			),
		)
		.orderBy(
			sql`ts_rank(${fileContents.searchVector}, to_tsquery('english', ${tsQuery})) desc`,
		)
		.limit(limit);

	return results;
}
