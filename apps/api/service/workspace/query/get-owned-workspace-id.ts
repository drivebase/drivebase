import { workspaceMemberships, workspaces } from "@drivebase/db";
import { and, asc, eq } from "drizzle-orm";
import { logger } from "@/utils/logger";
import { createDefaultWorkspace } from "../mutation/create-default-workspace";
import type { WorkspaceDbLike } from "../shared/types";

// Resolve workspace id for owner, creating default if missing.
export async function getOwnedWorkspaceId(
	db: WorkspaceDbLike,
	ownerId: string,
	preferredWorkspaceId?: string,
) {
	if (preferredWorkspaceId) {
		const [preferredWorkspace] = await db
			.select({ id: workspaces.id })
			.from(workspaces)
			.where(
				and(
					eq(workspaces.id, preferredWorkspaceId),
					eq(workspaces.ownerId, ownerId),
				),
			)
			.limit(1);
		if (preferredWorkspace) return preferredWorkspaceId;
	}

	const [workspace] = await db
		.select({ id: workspaces.id })
		.from(workspaces)
		.where(eq(workspaces.ownerId, ownerId))
		.orderBy(asc(workspaces.createdAt))
		.limit(1);
	if (workspace) return workspace.id;

	logger.info({
		msg: "No workspace found, creating default workspace",
		ownerId,
	});
	const createdWorkspace = await createDefaultWorkspace(db, ownerId);
	return createdWorkspace.id;
}

// Resolve first workspace user can access, creating default if needed.
export async function getAccessibleWorkspaceId(
	db: WorkspaceDbLike,
	userId: string,
	preferredWorkspaceId?: string,
) {
	if (preferredWorkspaceId) {
		const [ownedPreferredWorkspace] = await db
			.select({ id: workspaces.id })
			.from(workspaces)
			.where(
				and(
					eq(workspaces.id, preferredWorkspaceId),
					eq(workspaces.ownerId, userId),
				),
			)
			.limit(1);
		if (ownedPreferredWorkspace) return preferredWorkspaceId;

		const [memberPreferredWorkspace] = await db
			.select({ id: workspaceMemberships.workspaceId })
			.from(workspaceMemberships)
			.where(
				and(
					eq(workspaceMemberships.workspaceId, preferredWorkspaceId),
					eq(workspaceMemberships.userId, userId),
				),
			)
			.limit(1);
		if (memberPreferredWorkspace) return preferredWorkspaceId;
	}

	const [ownedWorkspace] = await db
		.select({ id: workspaces.id })
		.from(workspaces)
		.where(eq(workspaces.ownerId, userId))
		.orderBy(asc(workspaces.createdAt))
		.limit(1);
	if (ownedWorkspace) return ownedWorkspace.id;

	const [memberWorkspace] = await db
		.select({ id: workspaceMemberships.workspaceId })
		.from(workspaceMemberships)
		.where(eq(workspaceMemberships.userId, userId))
		.orderBy(asc(workspaceMemberships.createdAt))
		.limit(1);
	if (memberWorkspace) return memberWorkspace.id;

	logger.info({
		msg: "No accessible workspace found, creating default workspace",
		userId,
	});
	const createdWorkspace = await createDefaultWorkspace(db, userId);
	return createdWorkspace.id;
}
