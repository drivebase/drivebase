import { ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import {
	buildTransferQueueJobId,
	getTransferQueue,
} from "../../../queue/transfer-queue";
import { logger } from "../../../utils/logger";
import { ActivityService } from "../../activity";
import { ProviderService } from "../../provider";
import { getFile } from "../query/file-read";

// Queue a background provider-to-provider transfer for a file.
export async function moveFileToProvider(
	db: Database,
	fileId: string,
	userId: string,
	targetProviderId: string,
	workspaceId: string,
) {
	logger.debug({
		msg: "Moving file to provider",
		userId,
		fileId,
		targetProviderId,
	});

	const file = await getFile(db, fileId, userId, workspaceId);
	if (file.providerId === targetProviderId) {
		throw new ValidationError("File is already on this provider");
	}

	const providerService = new ProviderService(db);
	await providerService.getProvider(file.providerId, userId, workspaceId);
	await providerService.getProvider(targetProviderId, userId, workspaceId);

	try {
		const activityService = new ActivityService(db);
		const activityJob = await activityService.create(workspaceId, {
			type: "provider_transfer",
			title: `Transfer ${file.name}`,
			message: "Queued for transfer",
			metadata: {
				fileId: file.id,
				fileName: file.name,
				sourceProviderId: file.providerId,
				targetProviderId,
				totalSize: file.size,
				phase: "queued",
			},
		});

		await getTransferQueue().add(
			"move-file-to-provider",
			{
				jobId: activityJob.id,
				workspaceId,
				userId,
				fileId: file.id,
				targetProviderId,
			},
			{ jobId: buildTransferQueueJobId(file.id, targetProviderId) },
		);

		await activityService.log({
			type: "move",
			userId,
			workspaceId,
			fileId: file.id,
			providerId: targetProviderId,
			folderId: file.folderId ?? undefined,
			metadata: {
				mode: "provider_transfer",
				sourceProviderId: file.providerId,
				targetProviderId,
				fileName: file.name,
				jobId: activityJob.id,
			},
		});

		return file;
	} catch (error) {
		logger.error({
			msg: "Queue file transfer failed",
			userId,
			fileId,
			targetProviderId,
			error,
		});
		throw error;
	}
}
