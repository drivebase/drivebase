import type { WorkspaceDbLike } from "../shared/types";

// Sync to provider is always enabled.
export async function getWorkspaceSyncOperationsToProvider(
	_db: WorkspaceDbLike,
	_workspaceId: string,
) {
	return true;
}
