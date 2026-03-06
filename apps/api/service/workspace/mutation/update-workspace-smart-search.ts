import type { Database } from "@drivebase/db";
import {
	fileContents,
	files,
	storageProviders,
	workspaces,
} from "@drivebase/db";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { getExtractionQueue } from "../../../queue/extraction-queue";
import { ActivityService } from "../../../service/activity";
import { logger } from "../../../utils/runtime/logger";

/**
 * Toggle smart search for a workspace.
 * On first enable, creates a bulk indexing job for all existing files.
 */
export async function updateWorkspaceSmartSearch(
	db: Database,
	workspaceId: string,
	enabled: boolean,
) {
	logger.debug({
		msg: "Updating workspace smart search setting",
		workspaceId,
		enabled,
	});

	const [workspace] = await db
		.update(workspaces)
		.set({ smartSearchEnabled: enabled, updatedAt: new Date() })
		.where(eq(workspaces.id, workspaceId))
		.returning();

	if (!workspace) throw new Error("Workspace not found");

	if (enabled) {
		await enqueueExistingFiles(db, workspaceId);
	}

	return workspace;
}

/**
 * Enqueue extraction jobs for all files in the workspace
 * that don't already have a file_contents record.
 */
async function enqueueExistingFiles(db: Database, workspaceId: string) {
	// Find provider IDs belonging to this workspace
	const workspaceProviderIds = db
		.select({ id: storageProviders.id })
		.from(storageProviders)
		.where(eq(storageProviders.workspaceId, workspaceId));

	// Find files that haven't been indexed yet
	const existingNodeIds = db
		.select({ nodeId: fileContents.nodeId })
		.from(fileContents)
		.where(eq(fileContents.workspaceId, workspaceId));

	const unindexedFiles = await db
		.select({ id: files.id })
		.from(files)
		.where(
			and(
				inArray(files.providerId, workspaceProviderIds),
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
				notInArray(files.id, existingNodeIds),
			),
		);

	logger.debug({
		msg: "Bulk indexing: found unindexed files",
		workspaceId,
		count: unindexedFiles.length,
	});

	if (unindexedFiles.length === 0) return;

	// Create a tracking job via ActivityService so it publishes to PubSub
	const activityService = new ActivityService(db);
	const trackingJob = await activityService.create(workspaceId, {
		type: "smart-search-indexing",
		title: "Smart Search Indexing",
		message: `Indexing ${unindexedFiles.length} files`,
		metadata: { totalFiles: unindexedFiles.length },
	});

	await activityService.update(trackingJob.id, { status: "running" });

	logger.debug({
		msg: "Bulk indexing: tracking job created",
		workspaceId,
		trackingJobId: trackingJob.id,
		totalFiles: unindexedFiles.length,
	});

	// Create file_contents records (pending) and enqueue extraction jobs
	const queue = getExtractionQueue();

	for (const file of unindexedFiles) {
		await db
			.insert(fileContents)
			.values({
				nodeId: file.id,
				workspaceId,
				extractionStatus: "pending",
			})
			.onConflictDoNothing();

		await queue.add(
			`extract-${file.id}`,
			{
				nodeId: file.id,
				workspaceId,
				trackingJobId: trackingJob.id,
			},
			{ jobId: `extract-${file.id}` },
		);
	}

	logger.debug({
		msg: "Bulk indexing: all extraction jobs enqueued",
		workspaceId,
		trackingJobId: trackingJob.id,
		totalEnqueued: unindexedFiles.length,
	});
}
