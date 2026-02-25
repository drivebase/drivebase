import {
	AuthorizationError,
	NotFoundError,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { users, workspaceMemberships, workspaces } from "@drivebase/db";
import { and, asc, eq } from "drizzle-orm";
import type { WorkspaceRole } from "../rbac";
import type { WorkspaceMemberRow } from "../shared/types";

// Get user role for a workspace (owner or member role).
export async function getWorkspaceAccessRole(
	db: Database,
	workspaceId: string,
	userId: string,
): Promise<WorkspaceRole | null> {
	const [workspace] = await db
		.select({ ownerId: workspaces.ownerId })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1);
	if (!workspace) return null;
	if (workspace.ownerId === userId) return "owner";

	const [membership] = await db
		.select({ role: workspaceMemberships.role })
		.from(workspaceMemberships)
		.where(
			and(
				eq(workspaceMemberships.workspaceId, workspaceId),
				eq(workspaceMemberships.userId, userId),
			),
		)
		.limit(1);

	return membership?.role ?? null;
}

// Enforce required workspace role and return resolved role.
export async function requireWorkspaceRole(
	db: Database,
	workspaceId: string,
	userId: string,
	allowedRoles: WorkspaceRole[],
): Promise<WorkspaceRole> {
	const role = await getWorkspaceAccessRole(db, workspaceId, userId);
	if (!role)
		throw new AuthorizationError("You do not have access to this workspace");
	if (!allowedRoles.includes(role)) {
		throw new AuthorizationError("Insufficient workspace permissions");
	}
	return role;
}

// List workspace members with owner first.
export async function listWorkspaceMembers(
	db: Database,
	workspaceId: string,
): Promise<WorkspaceMemberRow[]> {
	const [workspaceOwner] = await db
		.select({
			workspaceCreatedAt: workspaces.createdAt,
			ownerId: workspaces.ownerId,
			ownerName: users.name,
			ownerEmail: users.email,
		})
		.from(workspaces)
		.innerJoin(users, eq(users.id, workspaces.ownerId))
		.where(eq(workspaces.id, workspaceId))
		.limit(1);
	if (!workspaceOwner) throw new NotFoundError("Workspace");

	const membershipRows = await db
		.select({
			userId: users.id,
			name: users.name,
			email: users.email,
			role: workspaceMemberships.role,
			joinedAt: workspaceMemberships.createdAt,
		})
		.from(workspaceMemberships)
		.innerJoin(users, eq(users.id, workspaceMemberships.userId))
		.where(eq(workspaceMemberships.workspaceId, workspaceId))
		.orderBy(asc(users.name));

	const owner: WorkspaceMemberRow = {
		userId: workspaceOwner.ownerId,
		name: workspaceOwner.ownerName,
		email: workspaceOwner.ownerEmail,
		role: "owner",
		joinedAt: workspaceOwner.workspaceCreatedAt,
		isOwner: true,
	};

	const members = membershipRows
		.filter((member) => member.userId !== workspaceOwner.ownerId)
		.map((member) => ({ ...member, isOwner: false }));

	return [owner, ...members];
}

// Validate target user is not workspace owner.
export async function assertNotWorkspaceOwner(
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
		throw new ValidationError("Workspace owner role cannot be changed");
	}
}
