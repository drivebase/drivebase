import { workspaceAutoSyncProviders } from "@drivebase/db";
import { eq } from "drizzle-orm";
import type { WorkspaceDbLike } from "../shared/types";

export async function listWorkspaceAutoSyncProviderIds(
	db: WorkspaceDbLike,
	workspaceId: string,
) {
	const rows = await db
		.select({ providerId: workspaceAutoSyncProviders.providerId })
		.from(workspaceAutoSyncProviders)
		.where(eq(workspaceAutoSyncProviders.workspaceId, workspaceId));

	return rows.map((row) => row.providerId);
}
