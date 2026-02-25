import { workspaces } from "@drivebase/db";
import { eq } from "drizzle-orm";
import type { WorkspaceDbLike } from "../shared/types";

// Return whether workspace syncs operations to providers.
export async function getWorkspaceSyncOperationsToProvider(
	db: WorkspaceDbLike,
	workspaceId: string,
) {
	const [workspace] = await db
		.select({ syncOperationsToProvider: workspaces.syncOperationsToProvider })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1);

	return workspace?.syncOperationsToProvider ?? false;
}
