import type { Database } from "@drivebase/db";
import { workspaces } from "@drivebase/db";
import { and, asc, eq } from "drizzle-orm";
import { logger } from "../../utils/logger";

const DEFAULT_WORKSPACE_NAME = "My Workspace";
const DEFAULT_WORKSPACE_COLOR = "sky";
const WORKSPACE_COLORS = new Set(["rose", "peach", "amber", "mint", "sky"]);

type WorkspaceDbLike = Pick<Database, "insert" | "select">;

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

	return workspace;
}
