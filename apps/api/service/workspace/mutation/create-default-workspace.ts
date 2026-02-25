import { workspaces } from "@drivebase/db";
import { logger } from "@/utils/logger";
import {
	DEFAULT_WORKSPACE_COLOR,
	DEFAULT_WORKSPACE_NAME,
} from "../shared/constants";
import type { WorkspaceDbLike } from "../shared/types";

// Create a default personal workspace for a user.
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
