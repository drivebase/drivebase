import type { Database } from "@drivebase/db";
import { workspaces } from "@drivebase/db";
import { asc, eq } from "drizzle-orm";
import { logger } from "../../utils/logger";

const DEFAULT_WORKSPACE_NAME = "My Workspace";

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
) {
	logger.debug({ msg: "Resolving owned workspace", ownerId });

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
	logger.debug({ msg: "Listing owned workspaces", ownerId });

	return db
		.select()
		.from(workspaces)
		.where(eq(workspaces.ownerId, ownerId))
		.orderBy(asc(workspaces.createdAt));
}
