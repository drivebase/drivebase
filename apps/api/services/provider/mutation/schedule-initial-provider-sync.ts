import type { Database } from "@drivebase/db";
import { enqueueSyncJob } from "@/queue/sync-queue";
import { logger } from "@/utils/logger";
import { syncProvider } from "./sync-provider";

interface InitialSyncParams {
	db: Database;
	providerId: string;
	workspaceId: string;
	userId: string;
	context: string;
}

// Schedule initial sync and fall back to in-process sync on queue failure.
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
