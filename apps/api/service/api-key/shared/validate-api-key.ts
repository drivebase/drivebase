import { apiKeys, users } from "@drivebase/db";
import { eq } from "drizzle-orm";
import type { Database } from "@drivebase/db";
import { hashApiKey } from "../../../utils/api-key";
import type { ApiKeyAuthResult } from "./types";

export async function validateApiKey(
	db: Database,
	rawKey: string,
): Promise<ApiKeyAuthResult | null> {
	const keyHash = hashApiKey(rawKey);

	const row = await db
		.select({
			id: apiKeys.id,
			scopes: apiKeys.scopes,
			isActive: apiKeys.isActive,
			expiresAt: apiKeys.expiresAt,
			userId: apiKeys.userId,
			email: users.email,
			role: users.role,
		})
		.from(apiKeys)
		.innerJoin(users, eq(apiKeys.userId, users.id))
		.where(eq(apiKeys.keyHash, keyHash))
		.limit(1)
		.then((rows) => rows[0] ?? null);

	if (!row) return null;
	if (!row.isActive) return null;
	if (row.expiresAt && row.expiresAt < new Date()) return null;

	// Fire-and-forget lastUsedAt update
	db.update(apiKeys)
		.set({ lastUsedAt: new Date() })
		.where(eq(apiKeys.id, row.id))
		.catch(() => undefined);

	return {
		userId: row.userId,
		email: row.email,
		role: row.role,
		scopes: row.scopes,
	};
}
