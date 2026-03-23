import type { Job as DbJob } from "@drivebase/db";
import type { ActivityService } from "@/service/activity";
import { logger } from "@/utils/runtime/logger";
import {
	buildTransferQueueJobId,
	getTransferQueue,
	type ProviderBatchTransferJobData,
	type ProviderFileTransferJobData,
	type ProviderFolderTransferJobData,
	type ProviderRootTransferJobData,
} from "./queue";

type EnqueueProviderTransferInput =
	| (Omit<ProviderRootTransferJobData, "jobId"> & {
			title: string;
			message?: string;
			metadata?: Record<string, unknown>;
	  })
	| (Omit<ProviderFileTransferJobData, "jobId"> & {
			title: string;
			message?: string;
			metadata?: Record<string, unknown>;
	  })
	| (Omit<ProviderFolderTransferJobData, "jobId"> & {
			title: string;
			message?: string;
			metadata?: Record<string, unknown>;
	  })
	| (Omit<ProviderBatchTransferJobData, "jobId"> & {
			title: string;
			message?: string;
			metadata?: Record<string, unknown>;
	  });

export interface EnqueuedProviderTransfer {
	activityJob: DbJob;
	queueJobId: string;
}

export async function enqueueProviderTransfer(
	activityService: ActivityService,
	input: EnqueueProviderTransferInput,
): Promise<EnqueuedProviderTransfer> {
	logger.debug({
		msg: "[transfer:enqueue] creating activity job",
		entity: input.entity,
		operation: input.operation,
		workspaceId: input.workspaceId,
		userId: input.userId,
		parentJobId: input.parentJobId ?? null,
		fileId: "fileId" in input ? input.fileId : undefined,
		folderId: "folderId" in input ? input.folderId : undefined,
	});

	// If this job has a parentJobId, it's a child job and we should
	// suppress the GraphQL subscription event to reduce websocket noise.
	const suppressEvent = Boolean(input.parentJobId);

	const activityJob = await activityService.create(input.workspaceId, {
		type: "provider_transfer",
		title: input.title,
		message: input.message ?? "Queued for transfer",
		metadata: {
			...(input.metadata ?? {}),
			entity: input.entity,
			operation: input.operation,
			parentJobId: input.parentJobId ?? null,
			phase: "queued",
		},
		suppressEvent,
	});

	const queueJobId = buildTransferQueueJobId({
		jobId: activityJob.id,
		entity: input.entity,
	});

	await getTransferQueue().add(
		"provider-transfer",
		{
			...input,
			jobId: activityJob.id,
		},
		{ jobId: queueJobId },
	);

	await activityService.update(activityJob.id, {
		metadata: {
			...(activityJob.metadata ?? {}),
			queueJobId,
		},
		suppressEvent,
	});

	logger.debug({
		msg: "[transfer:enqueue] job enqueued",
		activityJobId: activityJob.id,
		queueJobId,
		entity: input.entity,
		operation: input.operation,
		parentJobId: input.parentJobId ?? null,
	});

	return { activityJob, queueJobId };
}
