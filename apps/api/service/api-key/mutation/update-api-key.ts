import type { Database } from "@drivebase/db";
import { apiKeys } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { NotFoundError } from "@drivebase/core";
import type { UpdateApiKeyInput } from "../shared/types";

export async function updateApiKey(
	db: Database,
	id: string,
	userId: string,
	input: UpdateApiKeyInput,
) {
	const updates: Record<string, unknown> = { updatedAt: new Date() };
	if (input.name !== undefined && input.name !== null) {
		updates.name = input.name.trim();
	}
	if (input.description !== undefined) {
		updates.description = input.description ?? null;
	}

	const [updated] = await db
		.update(apiKeys)
		.set(updates)
		.where(and(eq(apiKeys.id, id), eq(apiKeys.userId, userId)))
		.returning();

	if (!updated) throw new NotFoundError("API key not found");
	return updated;
}
