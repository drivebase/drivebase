import { NotFoundError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { workspaceMemberships, workspaces } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import type { WorkspaceRole } from "../rbac";

// Update existing member role.
export async function updateWorkspaceMemberRole(
	db: Database,
	workspaceId: string,
	targetUserId: string,
	role: WorkspaceRole,
) {
	if (role === "owner") {
		throw new ValidationError("Owner role cannot be assigned");
	}

	const [workspace] = await db
		.select({ ownerId: workspaces.ownerId })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1);

	if (!workspace) throw new NotFoundError("Workspace");
	if (workspace.ownerId === targetUserId) {
		throw new ValidationError("Workspace owner role cannot be changed");
	}

	const [member] = await db
		.update(workspaceMemberships)
		.set({ role, updatedAt: new Date() })
		.where(
			and(
				eq(workspaceMemberships.workspaceId, workspaceId),
				eq(workspaceMemberships.userId, targetUserId),
			),
		)
		.returning({ id: workspaceMemberships.id });

	if (!member) throw new NotFoundError("Workspace member");
	return true;
}

// Remove member from workspace.
export async function removeWorkspaceMember(
	db: Database,
	workspaceId: string,
	targetUserId: string,
) {
	const [workspace] = await db
		.select({ ownerId: workspaces.ownerId })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1);

	if (!workspace) throw new NotFoundError("Workspace");
	if (workspace.ownerId === targetUserId) {
		throw new ValidationError("Workspace owner cannot be removed");
	}

	const deleted = await db
		.delete(workspaceMemberships)
		.where(
			and(
				eq(workspaceMemberships.workspaceId, workspaceId),
				eq(workspaceMemberships.userId, targetUserId),
			),
		)
		.returning({ id: workspaceMemberships.id });

	if (deleted.length === 0) throw new NotFoundError("Workspace member");
	return true;
}
