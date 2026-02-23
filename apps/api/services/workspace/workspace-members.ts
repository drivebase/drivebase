import {
	AuthorizationError,
	NotFoundError,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import {
	users,
	workspaceInvites,
	workspaceMemberships,
	workspaces,
} from "@drivebase/db";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { telemetry } from "../../telemetry";
import type { WorkspaceRole } from "./rbac";

type WorkspaceMemberRow = {
	userId: string;
	name: string;
	email: string;
	role: WorkspaceRole;
	joinedAt: Date;
	isOwner: boolean;
};

type WorkspaceInviteRow = {
	id: string;
	token: string;
	role: WorkspaceRole;
	expiresAt: Date;
	createdAt: Date;
};

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

	if (!workspace) {
		return null;
	}

	if (workspace.ownerId === userId) {
		return "owner";
	}

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

export async function requireWorkspaceRole(
	db: Database,
	workspaceId: string,
	userId: string,
	allowedRoles: WorkspaceRole[],
): Promise<WorkspaceRole> {
	const role = await getWorkspaceAccessRole(db, workspaceId, userId);

	if (!role) {
		throw new AuthorizationError("You do not have access to this workspace");
	}

	if (!allowedRoles.includes(role)) {
		throw new AuthorizationError("Insufficient workspace permissions");
	}

	return role;
}

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

	if (!workspaceOwner) {
		throw new NotFoundError("Workspace");
	}

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

	const filteredMembers = membershipRows
		.filter((member) => member.userId !== workspaceOwner.ownerId)
		.map((member) => ({
			userId: member.userId,
			name: member.name,
			email: member.email,
			role: member.role,
			joinedAt: member.joinedAt,
			isOwner: false,
		}));

	return [owner, ...filteredMembers];
}

export async function createWorkspaceInvite(
	db: Database,
	workspaceId: string,
	invitedBy: string,
	role: WorkspaceRole,
	expiresInDays: number,
): Promise<WorkspaceInviteRow> {
	if (role === "owner") {
		throw new ValidationError("Owner role cannot be assigned through invites");
	}

	if (expiresInDays < 1 || expiresInDays > 30) {
		throw new ValidationError(
			"Invite expiration must be between 1 and 30 days",
		);
	}

	const token = `wsi_${crypto.randomUUID().replaceAll("-", "")}`;
	const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

	const [invite] = await db
		.insert(workspaceInvites)
		.values({
			workspaceId,
			token,
			role,
			invitedBy,
			expiresAt,
		})
		.returning({
			id: workspaceInvites.id,
			token: workspaceInvites.token,
			role: workspaceInvites.role,
			expiresAt: workspaceInvites.expiresAt,
			createdAt: workspaceInvites.createdAt,
		});

	if (!invite) {
		throw new Error("Failed to create workspace invite");
	}

	return invite;
}

export async function listActiveWorkspaceInvites(
	db: Database,
	workspaceId: string,
): Promise<WorkspaceInviteRow[]> {
	return db
		.select({
			id: workspaceInvites.id,
			token: workspaceInvites.token,
			role: workspaceInvites.role,
			expiresAt: workspaceInvites.expiresAt,
			createdAt: workspaceInvites.createdAt,
		})
		.from(workspaceInvites)
		.where(
			and(
				eq(workspaceInvites.workspaceId, workspaceId),
				isNull(workspaceInvites.revokedAt),
				isNull(workspaceInvites.acceptedAt),
				gt(workspaceInvites.expiresAt, new Date()),
			),
		)
		.orderBy(asc(workspaceInvites.createdAt));
}

export async function revokeWorkspaceInvite(
	db: Database,
	workspaceId: string,
	inviteId: string,
): Promise<boolean> {
	const [invite] = await db
		.update(workspaceInvites)
		.set({
			revokedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(workspaceInvites.id, inviteId),
				eq(workspaceInvites.workspaceId, workspaceId),
				isNull(workspaceInvites.revokedAt),
			),
		)
		.returning({ id: workspaceInvites.id });

	if (!invite) {
		throw new NotFoundError("Workspace invite");
	}

	return true;
}

export async function acceptWorkspaceInvite(
	db: Database,
	token: string,
	userId: string,
) {
	const [invite] = await db
		.select({
			id: workspaceInvites.id,
			workspaceId: workspaceInvites.workspaceId,
			role: workspaceInvites.role,
			invitedBy: workspaceInvites.invitedBy,
			expiresAt: workspaceInvites.expiresAt,
			revokedAt: workspaceInvites.revokedAt,
			acceptedAt: workspaceInvites.acceptedAt,
			ownerId: workspaces.ownerId,
			workspaceName: workspaces.name,
			workspaceColor: workspaces.color,
			workspaceCreatedAt: workspaces.createdAt,
			workspaceUpdatedAt: workspaces.updatedAt,
		})
		.from(workspaceInvites)
		.innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
		.where(eq(workspaceInvites.token, token))
		.limit(1);

	if (!invite) {
		throw new NotFoundError("Workspace invite");
	}

	if (invite.revokedAt) {
		throw new ValidationError("Invite has been revoked");
	}

	if (invite.acceptedAt) {
		throw new ValidationError("Invite has already been accepted");
	}

	if (invite.expiresAt.getTime() < Date.now()) {
		throw new ValidationError("Invite has expired");
	}

	if (invite.ownerId !== userId) {
		await db
			.insert(workspaceMemberships)
			.values({
				workspaceId: invite.workspaceId,
				userId,
				role: invite.role,
				invitedBy: invite.invitedBy,
			})
			.onConflictDoUpdate({
				target: [workspaceMemberships.workspaceId, workspaceMemberships.userId],
				set: {
					role: invite.role,
					invitedBy: invite.invitedBy,
					updatedAt: new Date(),
				},
			});
	}

	await db
		.update(workspaceInvites)
		.set({
			acceptedBy: userId,
			acceptedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(workspaceInvites.id, invite.id));

	telemetry.capture("workspace_invite_accepted");

	return {
		id: invite.workspaceId,
		name: invite.workspaceName,
		color: invite.workspaceColor,
		ownerId: invite.ownerId,
		createdAt: invite.workspaceCreatedAt,
		updatedAt: invite.workspaceUpdatedAt,
	};
}

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

	if (!workspace) {
		throw new NotFoundError("Workspace");
	}

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

	if (!member) {
		throw new NotFoundError("Workspace member");
	}

	return true;
}

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

	if (!workspace) {
		throw new NotFoundError("Workspace");
	}

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

	if (deleted.length === 0) {
		throw new NotFoundError("Workspace member");
	}

	return true;
}
