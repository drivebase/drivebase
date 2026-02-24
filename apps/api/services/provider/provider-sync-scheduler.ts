import type { Database } from "@drivebase/db";
import { enqueueSyncJob } from "../../queue/sync-queue";
import { logger } from "../../utils/logger";
import { syncProvider } from "./provider-sync";

interface InitialSyncParams {
	db: Database;
	providerId: string;
	workspaceId: string;
	userId: string;
	context: string;
}

/**
 * Schedule initial provider sync.
 * Preferred path is BullMQ. If queue enqueue fails (e.g. transient Redis issue),
 * fall back to an in-process background sync so we don't lose first sync.
 */
export async function scheduleInitialProviderSync({
	db,
	providerId,
	workspaceId,
	userId,
	context,
}: InitialSyncParams): Promise<void> {
	try {
		await enqueueSyncJob({
			providerId,
			workspaceId,
			userId,
			recursive: true,
			pruneDeleted: false,
		});
		return;
	} catch (error) {
		logger.error({
			msg: "Failed to enqueue initial provider sync; falling back to in-process sync",
			context,
			providerId,
			workspaceId,
			userId,
			errorName: error instanceof Error ? error.name : undefined,
			errorMessage: error instanceof Error ? error.message : String(error),
			error,
		});
	}

	// Fire-and-forget fallback. This keeps connect/callback responses fast while
	// still ensuring an initial sync gets attempted.
	void syncProvider(db, providerId, workspaceId, userId, {
		recursive: true,
		pruneDeleted: false,
	}).catch((error) => {
		logger.error({
			msg: "Fallback initial provider sync failed",
			context,
			providerId,
			workspaceId,
			userId,
			errorName: error instanceof Error ? error.name : undefined,
			errorMessage: error instanceof Error ? error.message : String(error),
			error,
		});
	});
}
