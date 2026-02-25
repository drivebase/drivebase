import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { eq } from "drizzle-orm";

// List providers for a workspace ordered by creation date.
export async function getProviders(db: Database, workspaceId: string) {
	return db
		.select()
		.from(storageProviders)
		.where(eq(storageProviders.workspaceId, workspaceId))
		.orderBy(storageProviders.createdAt);
}
