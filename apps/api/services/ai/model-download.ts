import type { Database } from "@drivebase/db";
import { workspaceAiSettings } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { ActivityService } from "../activity";
import { ensureModel, getModelDownloadStatus } from "./inference-client";

type TaskType = "embedding" | "ocr" | "object_detection";
type TierType = "lightweight" | "medium" | "heavy";

interface ModelTaskConfig {
	task: TaskType;
	tier: TierType;
	label: string;
}

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDownloadCompletion(
	downloadId: string,
	maxAttempts = 600,
): Promise<{
	status: "completed" | "failed";
	progress: number;
	message?: string;
}> {
	for (let i = 0; i < maxAttempts; i += 1) {
		const status = await getModelDownloadStatus(downloadId);
		if (status.status === "completed") {
			return {
				status: "completed",
				progress: status.progress,
				message: status.message,
			};
		}
		if (status.status === "failed") {
			return {
				status: "failed",
				progress: status.progress,
				message: status.message,
			};
		}
		await wait(1000);
	}

	return {
		status: "failed",
		progress: 0,
		message: "Timed out waiting for model download",
	};
}

export async function scheduleModelPreparation(
	db: Database,
	workspaceId: string,
	settings: {
		enabled: boolean;
		embeddingTier: TierType;
		ocrTier: TierType;
		objectTier: TierType;
	},
) {
	if (!env.AI_INFERENCE_URL) {
		logger.warn({
			msg: "Skipping model preparation: AI inference service URL not configured",
			workspaceId,
		});
		return;
	}

	await db
		.update(workspaceAiSettings)
		.set({ modelsReady: false, updatedAt: new Date() })
		.where(eq(workspaceAiSettings.workspaceId, workspaceId));

	logger.info({
		msg: "Scheduling AI model preparation",
		workspaceId,
		embeddingTier: settings.embeddingTier,
		ocrTier: settings.ocrTier,
		objectTier: settings.objectTier,
	});

	const activityService = new ActivityService(db);
	const job = await activityService.create(workspaceId, {
		type: "ai_model_download",
		title: "Preparing AI models",
		message: "Starting model checks",
		metadata: {
			workspaceId,
			phase: "initializing",
		},
	});

	const tasks: ModelTaskConfig[] = [
		{
			task: "embedding",
			tier: settings.embeddingTier,
			label: `Embedding (${settings.embeddingTier})`,
		},
		{
			task: "ocr",
			tier: settings.ocrTier,
			label: `OCR (${settings.ocrTier})`,
		},
		{
			task: "object_detection",
			tier: settings.objectTier,
			label: `Object detection (${settings.objectTier})`,
		},
	];

	void (async () => {
		try {
			for (const [idx, task] of tasks.entries()) {
				const taskBase = idx / tasks.length;
				const taskWeight = 1 / tasks.length;

				await activityService.update(job.id, {
					status: "running",
					progress: taskBase,
					message: `Preparing ${task.label}`,
					metadata: {
						workspaceId,
						task: task.task,
						tier: task.tier,
						taskIndex: idx + 1,
						taskTotal: tasks.length,
					},
				});

				const ensure = await ensureModel({
					task: task.task,
					tier: task.tier,
				});

				logger.debug({
					msg: "Model ensure response",
					workspaceId,
					task: task.task,
					tier: task.tier,
					status: ensure.status,
					modelId: ensure.modelId,
					downloadId: ensure.downloadId,
				});

				if (ensure.status === "completed") {
					await activityService.update(job.id, {
						status: "running",
						progress: taskBase + taskWeight,
						message: `${task.label} ready`,
						metadata: {
							workspaceId,
							task: task.task,
							tier: task.tier,
							taskIndex: idx + 1,
							taskTotal: tasks.length,
							modelId: ensure.modelId,
						},
					});
					continue;
				}

				const completion = await waitForDownloadCompletion(ensure.downloadId);
				if (completion.status === "failed") {
					await activityService.fail(
						job.id,
						completion.message ?? `Failed preparing ${task.label}`,
					);
					return;
				}

				await activityService.update(job.id, {
					status: "running",
					progress: taskBase + taskWeight,
					message: `${task.label} ready`,
					metadata: {
						workspaceId,
						task: task.task,
						tier: task.tier,
						taskIndex: idx + 1,
						taskTotal: tasks.length,
						modelId: ensure.modelId,
						downloadId: ensure.downloadId,
					},
				});
			}

			await db
				.update(workspaceAiSettings)
				.set({ modelsReady: true, updatedAt: new Date() })
				.where(eq(workspaceAiSettings.workspaceId, workspaceId));

			await activityService.complete(job.id, "AI models are ready");
			logger.info({ msg: "AI model preparation completed", workspaceId });
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Model preparation failed";
			logger.error({
				msg: "AI model preparation failed",
				workspaceId,
				error: message,
			});
			await activityService.fail(job.id, message);
		}
	})();
}
