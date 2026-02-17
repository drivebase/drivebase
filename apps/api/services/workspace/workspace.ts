import type { Database } from "@drivebase/db";
import { workspaces } from "@drivebase/db";
import { asc, eq } from "drizzle-orm";

const DEFAULT_WORKSPACE_NAME = "My Workspace";

type WorkspaceDbLike = Pick<Database, "insert" | "select">;

export async function createDefaultWorkspace(
	db: WorkspaceDbLike,
	ownerId: string,
) {
	const [workspace] = await db
		.insert(workspaces)
		.values({
			name: DEFAULT_WORKSPACE_NAME,
			ownerId,
		})
		.returning();

	if (!workspace) {
		throw new Error("Failed to create default workspace");
	}

	return workspace;
}

export async function getOwnedWorkspaceId(
	db: WorkspaceDbLike,
	ownerId: string,
) {
	const [workspace] = await db
		.select({ id: workspaces.id })
		.from(workspaces)
		.where(eq(workspaces.ownerId, ownerId))
		.orderBy(asc(workspaces.createdAt))
		.limit(1);

	if (workspace) {
		return workspace.id;
	}

	const createdWorkspace = await createDefaultWorkspace(db, ownerId);
	return createdWorkspace.id;
}
