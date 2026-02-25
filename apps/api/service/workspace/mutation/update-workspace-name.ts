import { workspaces } from "@drivebase/db";
import { eq } from "drizzle-orm";
import type { WorkspaceUpdateDbLike } from "../shared/types";

// Update workspace display name.
export async function updateWorkspaceName(
	db: WorkspaceUpdateDbLike,
	workspaceId: string,
	name: string,
) {
	const trimmedName = name.trim();
	if (!trimmedName) throw new Error("Workspace name is required");

	const [workspace] = await db
		.update(workspaces)
		.set({ name: trimmedName, updatedAt: new Date() })
		.where(eq(workspaces.id, workspaceId))
		.returning();

	if (!workspace) throw new Error("Workspace not found");
	return workspace;
}
