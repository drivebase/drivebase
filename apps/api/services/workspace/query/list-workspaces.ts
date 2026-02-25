import { workspaceMemberships, workspaces } from "@drivebase/db";
import { asc, eq } from "drizzle-orm";
import type { WorkspaceDbLike } from "../shared/types";

// List workspaces owned by user.
export async function listOwnedWorkspaces(
	db: WorkspaceDbLike,
	ownerId: string,
) {
	return db
		.select()
		.from(workspaces)
		.where(eq(workspaces.ownerId, ownerId))
		.orderBy(asc(workspaces.createdAt));
}

// List all accessible workspaces for user (owned + memberships).
export async function listAccessibleWorkspaces(
	db: WorkspaceDbLike,
	userId: string,
) {
	const owned = await db
		.select()
		.from(workspaces)
		.where(eq(workspaces.ownerId, userId))
		.orderBy(asc(workspaces.createdAt));

	const memberRows = await db
		.select({ workspace: workspaces })
		.from(workspaceMemberships)
		.innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
		.where(eq(workspaceMemberships.userId, userId))
		.orderBy(asc(workspaces.createdAt));

	const byId = new Map<string, (typeof owned)[number]>();
	for (const workspace of owned) byId.set(workspace.id, workspace);
	for (const row of memberRows)
		if (!byId.has(row.workspace.id)) byId.set(row.workspace.id, row.workspace);

	return Array.from(byId.values()).sort(
		(left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
	);
}
