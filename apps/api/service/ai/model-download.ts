import type { Database } from "@drivebase/db";
import { workspaceAiSettings } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { ActivityService } from "../activity";
import {
	ensureModel,
	getModelDownloadStatus,
	getModelReadyStatus,
} from "./inference-client";

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
	onProgress?: (status: {
		progress: number;
		message?: string;
	}) => Promise<void>,
): Promise<{
	status: "completed" | "failed";
	progress: number;
	message?: string;
}> {
	for (let i = 0; i < maxAttempts; i += 1) {
		const status = await getModelDownloadStatus(downloadId);
		if (onProgress && status.status !== "failed") {
			await onProgress({
				progress: status.progress,
				message: status.message,
			});
		}
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
	selectedTasks?: TaskType[],
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

	const allTasks: ModelTaskConfig[] = [
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
	const taskSet =
		selectedTasks && selectedTasks.length > 0
			? new Set<TaskType>(selectedTasks)
			: null;
	const tasks = taskSet
		? allTasks.filter((task) => taskSet.has(task.task))
		: allTasks;
	if (tasks.length === 0) {
		return;
	}

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

				const initialTaskProgress = Math.max(0, Math.min(1, ensure.progress));
				await activityService.update(job.id, {
					status: "running",
					progress: Math.min(
						0.999,
						taskBase + initialTaskProgress * taskWeight,
					),
					message: ensure.message ?? `Downloading ${task.label}`,
					metadata: {
						workspaceId,
						task: task.task,
						tier: task.tier,
						taskIndex: idx + 1,
						taskTotal: tasks.length,
						modelId: ensure.modelId,
						downloadId: ensure.downloadId,
						downloadProgress: initialTaskProgress,
					},
				});

				const completion = await waitForDownloadCompletion(
					ensure.downloadId,
					600,
					async ({ progress, message }) => {
						const taskProgress = Math.max(0, Math.min(1, progress));
						await activityService.update(job.id, {
							status: "running",
							progress: Math.min(0.999, taskBase + taskProgress * taskWeight),
							message: message ?? `Downloading ${task.label}`,
							metadata: {
								workspaceId,
								task: task.task,
								tier: task.tier,
								taskIndex: idx + 1,
								taskTotal: tasks.length,
								modelId: ensure.modelId,
								downloadId: ensure.downloadId,
								downloadProgress: taskProgress,
							},
						});
					},
				);
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

export async function syncWorkspaceModelReadiness(
	db: Database,
	workspaceId: string,
) {
	const [settings] = await db
		.select()
		.from(workspaceAiSettings)
		.where(eq(workspaceAiSettings.workspaceId, workspaceId))
		.limit(1);
	if (!settings) return null;

	if (!env.AI_INFERENCE_URL) {
		return settings;
	}

	try {
		const [embedding, ocr, object] = await Promise.all([
			getModelReadyStatus({
				task: "embedding",
				tier: settings.embeddingTier,
			}),
			getModelReadyStatus({
				task: "ocr",
				tier: settings.ocrTier,
			}),
			getModelReadyStatus({
				task: "object_detection",
				tier: settings.objectTier,
			}),
		]);

		const allReady = embedding.ready && ocr.ready && object.ready;
		const existingConfig =
			settings.config && typeof settings.config === "object"
				? settings.config
				: {};
		const [updated] = await db
			.update(workspaceAiSettings)
			.set({
				modelsReady: allReady,
				config: {
					...existingConfig,
					aiModelReady: {
						embedding: embedding.ready,
						ocr: ocr.ready,
						objectDetection: object.ready,
					},
				},
				updatedAt: new Date(),
			})
			.where(eq(workspaceAiSettings.workspaceId, workspaceId))
			.returning();

		return updated ?? settings;
	} catch (error) {
		logger.warn({
			msg: "Failed to sync workspace model readiness",
			workspaceId,
			error: error instanceof Error ? error.message : String(error),
		});
		return settings;
	}
}
