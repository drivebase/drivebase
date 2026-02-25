import { NotFoundError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import {
	workspaceInvites,
	workspaceMemberships,
	workspaces,
} from "@drivebase/db";
import { and, asc, eq, gt, isNull } from "drizzle-orm";
import { telemetry } from "@/telemetry";
import type { WorkspaceRole } from "../rbac";
import type { WorkspaceInviteRow } from "../shared/types";

// Create a workspace invite with bounded expiration.
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
		.values({ workspaceId, token, role, invitedBy, expiresAt })
		.returning({
			id: workspaceInvites.id,
			token: workspaceInvites.token,
			role: workspaceInvites.role,
			expiresAt: workspaceInvites.expiresAt,
			createdAt: workspaceInvites.createdAt,
		});

	if (!invite) throw new Error("Failed to create workspace invite");
	return invite;
}

// List non-expired, non-revoked, non-accepted invites.
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

// Revoke a pending invite.
export async function revokeWorkspaceInvite(
	db: Database,
	workspaceId: string,
	inviteId: string,
): Promise<boolean> {
	const [invite] = await db
		.update(workspaceInvites)
		.set({ revokedAt: new Date(), updatedAt: new Date() })
		.where(
			and(
				eq(workspaceInvites.id, inviteId),
				eq(workspaceInvites.workspaceId, workspaceId),
				isNull(workspaceInvites.revokedAt),
			),
		)
		.returning({ id: workspaceInvites.id });

	if (!invite) throw new NotFoundError("Workspace invite");
	return true;
}

// Accept an invite and join or update workspace membership.
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
			workspaceSyncOperationsToProvider: workspaces.syncOperationsToProvider,
			workspaceCreatedAt: workspaces.createdAt,
			workspaceUpdatedAt: workspaces.updatedAt,
		})
		.from(workspaceInvites)
		.innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
		.where(eq(workspaceInvites.token, token))
		.limit(1);

	if (!invite) throw new NotFoundError("Workspace invite");
	if (invite.revokedAt) throw new ValidationError("Invite has been revoked");
	if (invite.acceptedAt)
		throw new ValidationError("Invite has already been accepted");
	if (invite.expiresAt.getTime() < Date.now())
		throw new ValidationError("Invite has expired");

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
		.set({ acceptedBy: userId, acceptedAt: new Date(), updatedAt: new Date() })
		.where(eq(workspaceInvites.id, invite.id));

	telemetry.capture("workspace_invite_accepted");

	return {
		id: invite.workspaceId,
		name: invite.workspaceName,
		color: invite.workspaceColor,
		ownerId: invite.ownerId,
		syncOperationsToProvider: invite.workspaceSyncOperationsToProvider,
		createdAt: invite.workspaceCreatedAt,
		updatedAt: invite.workspaceUpdatedAt,
	};
}
