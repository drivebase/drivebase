import { ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { enqueueProviderTransfer } from "@/queue/transfer/enqueue";
import { logger } from "../../../utils/runtime/logger";
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
		const { activityJob } = await enqueueProviderTransfer(activityService, {
			entity: "file",
			operation: "cut",
			workspaceId,
			userId,
			fileId: file.id,
			targetProviderId,
			targetFolderId: null,
			title: `Transfer ${file.name}`,
			message: "Queued for transfer",
			metadata: {
				fileId: file.id,
				fileName: file.name,
				sourceProviderId: file.providerId,
				targetProviderId,
				totalSize: file.size,
			},
		});

		await activityService.log({
			kind: "file.transfer.queued",
			title: "Provider transfer queued",
			summary: file.name,
			status: "info",
			userId,
			workspaceId,
			details: {
				fileId: file.id,
				providerId: targetProviderId,
				folderId: file.folderId ?? undefined,
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
