import type { Database } from "@drivebase/db";
import { apiKeys } from "@drivebase/db";
import { eq } from "drizzle-orm";

export async function listApiKeys(db: Database, userId: string) {
	return db
		.select()
		.from(apiKeys)
		.where(eq(apiKeys.userId, userId))
		.orderBy(apiKeys.createdAt);
}
