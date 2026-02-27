import { ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import {
	buildFileLifecycleQueueJobId,
	getFileLifecycleQueue,
} from "../../../../queue/file-lifecycle-queue";
import { ActivityService } from "../../../activity";
import { ProviderService } from "../../../provider";
import { getFile } from "../../query/file-read";
import type { RestoreTier } from "../shared/types";

export async function requestFileRestore(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
	days: number,
	tier: RestoreTier,
) {
	if (!Number.isInteger(days) || days < 1 || days > 30) {
		throw new ValidationError("Restore days must be between 1 and 30");
	}

	const file = await getFile(db, fileId, userId, workspaceId);
	const activityService = new ActivityService(db);
	if (
		file.lifecycleState === "restore_requested" ||
		file.lifecycleState === "restoring"
	) {
		const job = await activityService.create(workspaceId, {
			type: "file_restore",
			title: `Restore ${file.name}`,
			message: "Restore already in progress",
			metadata: {
				fileId: file.id,
				providerId: file.providerId,
				phase: "already_in_progress",
			},
		});
		await activityService.complete(job.id, "Restore already in progress");
		return job;
	}

	const now = Date.now();
	if (
		file.lifecycleState === "restored_temporary" &&
		file.restoreExpiresAt &&
		file.restoreExpiresAt.getTime() > now
	) {
		const job = await activityService.create(workspaceId, {
			type: "file_restore",
			title: `Restore ${file.name}`,
			message: "File is already restored",
			metadata: {
				fileId: file.id,
				providerId: file.providerId,
				phase: "already_restored",
				restoreExpiresAt: file.restoreExpiresAt,
			},
		});
		await activityService.complete(job.id, "File is already restored");
		return job;
	}

	const providerService = new ProviderService(db);
	const providerRecord = await providerService.getProvider(
		file.providerId,
		userId,
		workspaceId,
	);
	const provider = await providerService.getProviderInstance(providerRecord);
	try {
		if (!provider.requestRestore) {
			throw new ValidationError(
				"Provider does not support lifecycle operations",
			);
		}
	} finally {
		await provider.cleanup();
	}

	const job = await activityService.create(workspaceId, {
		type: "file_restore",
		title: `Restore ${file.name}`,
		message: "Queued for restore",
		metadata: {
			fileId: file.id,
			providerId: file.providerId,
			phase: "queued",
			days,
			tier,
		},
	});

	await getFileLifecycleQueue().add(
		"file-lifecycle",
		{
			jobId: job.id,
			workspaceId,
			userId,
			fileId: file.id,
			action: "restore",
			days,
			tier,
		},
		{ jobId: buildFileLifecycleQueueJobId("restore", file.id) },
	);

	return job;
}
