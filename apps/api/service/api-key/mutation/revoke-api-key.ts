import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { apiKeys } from "@drivebase/db";
import { and, eq } from "drizzle-orm";

export async function revokeApiKey(
	db: Database,
	id: string,
	userId: string,
): Promise<boolean> {
	const result = await db
		.update(apiKeys)
		.set({ isActive: false, updatedAt: new Date() })
		.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
		.returning({ id: apiKeys.id });

	if (result.length === 0) throw new NotFoundError("API key not found");
	return true;
}
