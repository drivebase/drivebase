import { ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import {
	buildFileLifecycleQueueJobId,
	getFileLifecycleQueue,
} from "../../../../queue/file-lifecycle-queue";
import { ActivityService } from "../../../activity";
import { ProviderService } from "../../../provider";
import { getFile } from "../../query/file-read";

export async function archiveFile(
	db: Database,
	fileId: string,
	userId: string,
	workspaceId: string,
) {
	const file = await getFile(db, fileId, userId, workspaceId);
	const activityService = new ActivityService(db);

	if (file.lifecycleState === "archived") {
		const alreadyDone = await activityService.create(workspaceId, {
			type: "file_archive",
			title: `Archive ${file.name}`,
			message: "File is already archived",
			metadata: { fileId: file.id, providerId: file.providerId, phase: "done" },
		});
		await activityService.complete(alreadyDone.id, "File is already archived");
		return alreadyDone;
	}

	const providerService = new ProviderService(db);
	const providerRecord = await providerService.getProvider(
		file.providerId,
		userId,
		workspaceId,
	);
	const provider = await providerService.getProviderInstance(providerRecord);
	try {
		if (!provider.archiveFile) {
			throw new ValidationError(
				"Provider does not support lifecycle operations",
			);
		}
	} finally {
		await provider.cleanup();
	}

	const job = await activityService.create(workspaceId, {
		type: "file_archive",
		title: `Archive ${file.name}`,
		message: "Queued for archiving",
		metadata: {
			fileId: file.id,
			providerId: file.providerId,
			phase: "queued",
		},
	});

	await getFileLifecycleQueue().add(
		"file-lifecycle",
		{
			jobId: job.id,
			workspaceId,
			userId,
			fileId: file.id,
			action: "archive",
		},
		{ jobId: buildFileLifecycleQueueJobId("archive", file.id) },
	);

	return job;
}
