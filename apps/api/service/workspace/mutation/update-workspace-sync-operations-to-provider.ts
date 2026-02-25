import { workspaces } from "@drivebase/db";
import { eq } from "drizzle-orm";
import type { WorkspaceUpdateDbLike } from "../shared/types";

// Toggle provider-side sync behavior for workspace operations.
export async function updateWorkspaceSyncOperationsToProvider(
	db: WorkspaceUpdateDbLike,
	workspaceId: string,
	enabled: boolean,
) {
	const [workspace] = await db
		.update(workspaces)
		.set({ syncOperationsToProvider: enabled, updatedAt: new Date() })
		.where(eq(workspaces.id, workspaceId))
		.returning();

	if (!workspace) throw new Error("Workspace not found");
	return workspace;
}
