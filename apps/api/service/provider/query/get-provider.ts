import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";

// Fetch one provider scoped to workspace.
export async function getProvider(
	db: Database,
	providerId: string,
	workspaceId: string,
) {
	const [provider] = await db
		.select()
		.from(storageProviders)
		.where(
			and(
				eq(storageProviders.id, providerId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!provider) throw new NotFoundError("Provider");
	return provider;
}
