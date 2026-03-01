import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { apiKeys } from "@drivebase/db";
import { and, eq } from "drizzle-orm";

export async function getApiKey(db: Database, id: string, userId: string) {
	const row = await db
		.select()
		.from(apiKeys)
		.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
		.limit(1)
		.then((rows) => rows[0] ?? null);

	if (!row) throw new NotFoundError("API key not found");
	return row;
}
