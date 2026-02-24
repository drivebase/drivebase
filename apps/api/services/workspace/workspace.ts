import type { Database } from "@drivebase/db";
import { workspaceMemberships, workspaces } from "@drivebase/db";
import { and, asc, eq } from "drizzle-orm";
import { telemetry } from "../../telemetry";
import { logger } from "../../utils/logger";

const DEFAULT_WORKSPACE_NAME = "My Workspace";
const DEFAULT_WORKSPACE_COLOR = "sky";
const WORKSPACE_COLORS = new Set(["rose", "peach", "amber", "mint", "sky"]);

type WorkspaceDbLike = Pick<Database, "insert" | "select">;
type WorkspaceUpdateDbLike = Pick<Database, "update">;

export async function createDefaultWorkspace(
	db: WorkspaceDbLike,
	ownerId: string,
) {
	logger.info({ msg: "Creating default workspace", ownerId });

	const [workspace] = await db
		.insert(workspaces)
		.values({
			name: DEFAULT_WORKSPACE_NAME,
			color: DEFAULT_WORKSPACE_COLOR,
			ownerId,
		})
		.returning();

	if (!workspace) {
		logger.error({ msg: "Default workspace creation failed", ownerId });
		throw new Error("Failed to create default workspace");
	}

	logger.info({
		msg: "Default workspace created",
		ownerId,
		workspaceId: workspace.id,
	});

	return workspace;
}

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

		if (preferredWorkspace) {
			return preferredWorkspaceId;
		}
	}

	const [workspace] = await db
		.select({ id: workspaces.id })
		.from(workspaces)
		.where(eq(workspaces.ownerId, ownerId))
		.orderBy(asc(workspaces.createdAt))
		.limit(1);

	if (workspace) {
		logger.debug({
			msg: "Using existing workspace",
			ownerId,
			workspaceId: workspace.id,
		});
		return workspace.id;
	}

	logger.info({
		msg: "No workspace found, creating default workspace",
		ownerId,
	});

	const createdWorkspace = await createDefaultWorkspace(db, ownerId);

	logger.info({
		msg: "Workspace auto-created during resolution",
		ownerId,
		workspaceId: createdWorkspace.id,
	});

	return createdWorkspace.id;
}

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

		if (ownedPreferredWorkspace) {
			return preferredWorkspaceId;
		}

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

		if (memberPreferredWorkspace) {
			return preferredWorkspaceId;
		}
	}

	const [ownedWorkspace] = await db
		.select({ id: workspaces.id })
		.from(workspaces)
		.where(eq(workspaces.ownerId, userId))
		.orderBy(asc(workspaces.createdAt))
		.limit(1);

	if (ownedWorkspace) {
		logger.debug({
			msg: "Using owned workspace",
			userId,
			workspaceId: ownedWorkspace.id,
		});
		return ownedWorkspace.id;
	}

	const [memberWorkspace] = await db
		.select({ id: workspaceMemberships.workspaceId })
		.from(workspaceMemberships)
		.where(eq(workspaceMemberships.userId, userId))
		.orderBy(asc(workspaceMemberships.createdAt))
		.limit(1);

	if (memberWorkspace) {
		logger.debug({
			msg: "Using member workspace",
			userId,
			workspaceId: memberWorkspace.id,
		});
		return memberWorkspace.id;
	}

	logger.info({
		msg: "No accessible workspace found, creating default workspace",
		userId,
	});

	const createdWorkspace = await createDefaultWorkspace(db, userId);

	logger.info({
		msg: "Workspace auto-created during accessible resolution",
		userId,
		workspaceId: createdWorkspace.id,
	});

	return createdWorkspace.id;
}

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

	for (const workspace of owned) {
		byId.set(workspace.id, workspace);
	}

	for (const row of memberRows) {
		if (!byId.has(row.workspace.id)) {
			byId.set(row.workspace.id, row.workspace);
		}
	}

	return Array.from(byId.values()).sort(
		(left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
	);
}

export async function createWorkspace(
	db: WorkspaceDbLike,
	ownerId: string,
	name: string,
	color: string,
) {
	const trimmedName = name.trim();
	if (!trimmedName) {
		throw new Error("Workspace name is required");
	}

	if (!WORKSPACE_COLORS.has(color)) {
		throw new Error("Invalid workspace color");
	}

	logger.info({ msg: "Creating workspace", ownerId, name: trimmedName, color });

	const [workspace] = await db
		.insert(workspaces)
		.values({
			name: trimmedName,
			color,
			ownerId,
		})
		.returning();

	if (!workspace) {
		throw new Error("Failed to create workspace");
	}

	logger.info({
		msg: "Workspace created",
		ownerId,
		workspaceId: workspace.id,
	});

	telemetry.capture("workspace_created");

	return workspace;
}

export async function updateWorkspaceName(
	db: WorkspaceUpdateDbLike,
	workspaceId: string,
	name: string,
) {
	const trimmedName = name.trim();
	if (!trimmedName) {
		throw new Error("Workspace name is required");
	}

	const [workspace] = await db
		.update(workspaces)
		.set({
			name: trimmedName,
			updatedAt: new Date(),
		})
		.where(eq(workspaces.id, workspaceId))
		.returning();

	if (!workspace) {
		throw new Error("Workspace not found");
	}

	return workspace;
}

export async function updateWorkspaceSyncOperationsToProvider(
	db: WorkspaceUpdateDbLike,
	workspaceId: string,
	enabled: boolean,
) {
	const [workspace] = await db
		.update(workspaces)
		.set({
			syncOperationsToProvider: enabled,
			updatedAt: new Date(),
		})
		.where(eq(workspaces.id, workspaceId))
		.returning();

	if (!workspace) {
		throw new Error("Workspace not found");
	}

	return workspace;
}

export async function getWorkspaceSyncOperationsToProvider(
	db: WorkspaceDbLike,
	workspaceId: string,
) {
	const [workspace] = await db
		.select({ syncOperationsToProvider: workspaces.syncOperationsToProvider })
		.from(workspaces)
		.where(eq(workspaces.id, workspaceId))
		.limit(1);

	return workspace?.syncOperationsToProvider ?? false;
}
