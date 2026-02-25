import { workspaces } from "@drivebase/db";
import { telemetry } from "@/telemetry";
import { logger } from "@/utils/logger";
import { WORKSPACE_COLORS } from "../shared/constants";
import type { WorkspaceDbLike } from "../shared/types";

// Create a user-owned workspace with validated color/name.
export async function createWorkspace(
	db: WorkspaceDbLike,
	ownerId: string,
	name: string,
	color: string,
) {
	const trimmedName = name.trim();
	if (!trimmedName) throw new Error("Workspace name is required");
	if (!WORKSPACE_COLORS.has(color)) throw new Error("Invalid workspace color");

	logger.info({ msg: "Creating workspace", ownerId, name: trimmedName, color });
	const [workspace] = await db
		.insert(workspaces)
		.values({ name: trimmedName, color, ownerId })
		.returning();

	if (!workspace) throw new Error("Failed to create workspace");
	logger.info({ msg: "Workspace created", ownerId, workspaceId: workspace.id });
	telemetry.capture("workspace_created");
	return workspace;
}
