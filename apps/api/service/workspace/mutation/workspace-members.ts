import { NotFoundError, ValidationError } from "@drivebase/core";
import type { AccessGrant, Database } from "@drivebase/db";
import {
	nodes,
	storageProviders,
	users,
	workspaceMemberships,
	workspaces,
} from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import type { WorkspaceRole } from "../rbac";

async function validateAccessGrants(
	db: Database,
	workspaceId: string,
	grants: AccessGrant[],
) {
	for (const grant of grants) {
		// Verify provider belongs to this workspace
		const [provider] = await db
			.select({ id: storageProviders.id })
			.from(storageProviders)
			.where(
				and(
					eq(storageProviders.id, grant.providerId),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.limit(1);
		if (!provider) {
			throw new ValidationError(
				`Provider ${grant.providerId} does not belong to this workspace`,
			);
		}

		// If a folder path is specified, verify it exists in the provider
		if (grant.folderPath) {
			const path = grant.folderPath.startsWith("/")
				? grant.folderPath
				: `/${grant.folderPath}`;
			const [folder] = await db
				.select({ id: nodes.id })
				.from(nodes)
				.where(
					and(
						eq(nodes.providerId, grant.providerId),
						eq(nodes.virtualPath, path),
						eq(nodes.nodeType, "folder"),
					),
				)
				.limit(1);
			if (!folder) {
				throw new ValidationError(
					`Folder path "${path}" not found in provider`,
				);
			}
		}
	}
}

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

// Set (replace) access grants for a workspace member.
// Pass an empty array to grant full workspace access.
export async function setMemberAccessGrants(
	db: Database,
	workspaceId: string,
	targetUserId: string,
	grants: AccessGrant[],
) {
	const [workspace] = await db
		.select({ ownerId: workspaces.ownerId })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1);

	if (!workspace) throw new NotFoundError("Workspace");
	if (workspace.ownerId === targetUserId) {
		throw new ValidationError("Cannot restrict access for workspace owner");
	}

	if (grants.length > 0) {
		await validateAccessGrants(db, workspaceId, grants);
	}

	const [member] = await db
		.update(workspaceMemberships)
		.set({ accessGrants: grants, updatedAt: new Date() })
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

// Add a user to a workspace directly by their email address.
export async function addWorkspaceMemberByEmail(
	db: Database,
	workspaceId: string,
	email: string,
	role: WorkspaceRole,
	invitedBy: string,
	accessGrants: AccessGrant[] = [],
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

	const [user] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email.toLowerCase().trim()))
		.limit(1);

	if (!user) throw new NotFoundError("User with that email");

	if (workspace.ownerId === user.id) {
		throw new ValidationError("User is already the workspace owner");
	}

	if (accessGrants.length > 0) {
		await validateAccessGrants(db, workspaceId, accessGrants);
	}

	await db
		.insert(workspaceMemberships)
		.values({ workspaceId, userId: user.id, role, invitedBy, accessGrants })
		.onConflictDoUpdate({
			target: [workspaceMemberships.workspaceId, workspaceMemberships.userId],
			set: { role, invitedBy, accessGrants, updatedAt: new Date() },
		});

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
