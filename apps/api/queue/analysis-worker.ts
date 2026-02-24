import { createHash } from "node:crypto";
import {
	fileAnalysisRuns,
	fileDetectedObjects,
	fileEmbeddings,
	fileExtractedText,
	files,
	getDb,
} from "@drivebase/db";
import { Worker } from "bullmq";
import { and, eq } from "drizzle-orm";
import { env } from "../config/env";
import { createBullMQConnection } from "../redis/client";
import { refreshWorkspaceAiProgress } from "../services/ai/ai-settings";
import {
	inferEmbedding,
	inferObjects,
	inferOcr,
} from "../services/ai/inference-client";
import { logger } from "../utils/logger";
import type { FileAnalysisJobData } from "./analysis-queue";

const EMBEDDING_DIM = 512;

let analysisWorker: Worker<FileAnalysisJobData> | null = null;

function isImageMime(mimeType: string): boolean {
	return mimeType.toLowerCase().startsWith("image/");
}

function isPdfMime(mimeType: string): boolean {
	return mimeType.toLowerCase() === "application/pdf";
}

function isTextMime(mimeType: string): boolean {
	const normalized = mimeType.toLowerCase();
	return (
		normalized.startsWith("text/") ||
		normalized === "application/json" ||
		normalized === "application/csv"
	);
}

function fallbackEmbedding(seed: string): number[] {
	const digest = createHash("sha256").update(seed).digest();
	const result = new Array<number>(EMBEDDING_DIM);
	for (let i = 0; i < EMBEDDING_DIM; i += 1) {
		const byte = digest[i % digest.length] ?? 0;
		result[i] = (byte / 255 - 0.5) * 2;
	}
	return result;
}

export function startAnalysisWorker(): Worker<FileAnalysisJobData> {
	if (analysisWorker) {
		return analysisWorker;
	}

	analysisWorker = new Worker<FileAnalysisJobData>(
		"file-analysis",
		async (job) => {
			const db = getDb();
			const { runId, workspaceId, fileId } = job.data;
			logger.debug({
				msg: "Processing file analysis job",
				jobId: job.id,
				runId,
				workspaceId,
				fileId,
			});

			const [run] = await db
				.select()
				.from(fileAnalysisRuns)
				.where(
					and(
						eq(fileAnalysisRuns.id, runId),
						eq(fileAnalysisRuns.workspaceId, workspaceId),
					),
				)
				.limit(1);

			if (!run) {
				return;
			}

			const [file] = await db
				.select({
					id: files.id,
					name: files.name,
					mimeType: files.mimeType,
				})
				.from(files)
				.where(
					and(
						eq(files.id, fileId),
						eq(files.workspaceId, workspaceId),
						eq(files.nodeType, "file"),
					),
				)
				.limit(1);

			if (!file) {
				await db
					.update(fileAnalysisRuns)
					.set({
						status: "failed",
						embeddingStatus: "failed",
						ocrStatus: "failed",
						objectDetectionStatus: "failed",
						embeddingError: "file_not_found",
						ocrError: "file_not_found",
						objectDetectionError: "file_not_found",
						completedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(fileAnalysisRuns.id, runId));
				await refreshWorkspaceAiProgress(db, workspaceId);
				return;
			}

			let embeddingStatus: "completed" | "failed" | "skipped" = "skipped";
			let ocrStatus: "completed" | "failed" | "skipped" = "skipped";
			let objectStatus: "completed" | "failed" | "skipped" = "skipped";
			let embeddingError: string | null = null;
			let ocrError: string | null = null;
			let objectError: string | null = null;

			await db
				.update(fileAnalysisRuns)
				.set({
					status: "running",
					attemptCount: run.attemptCount + 1,
					startedAt: run.startedAt ?? new Date(),
					updatedAt: new Date(),
				})
				.where(eq(fileAnalysisRuns.id, runId));

			try {
				const embedding = env.AI_INFERENCE_URL
					? await inferEmbedding({
							fileId: file.id,
							fileName: file.name,
							mimeType: file.mimeType,
							modelTier: run.tierEmbedding,
						})
					: {
							embedding: fallbackEmbedding(
								`${file.id}:${file.name}:${file.mimeType}`,
							),
							modelName: "fallback-local",
						};

				await db.insert(fileEmbeddings).values({
					fileId: file.id,
					workspaceId,
					runId,
					modelName: embedding.modelName,
					modelTier: run.tierEmbedding,
					embedding: embedding.embedding,
				});
				embeddingStatus = "completed";
			} catch (error) {
				embeddingStatus = "failed";
				embeddingError = error instanceof Error ? error.message : String(error);
			}

			const canOcr = isImageMime(file.mimeType) || isPdfMime(file.mimeType);
			if (canOcr) {
				if (env.AI_INFERENCE_URL) {
					try {
						const result = await inferOcr({
							fileId: file.id,
							fileName: file.name,
							mimeType: file.mimeType,
							modelTier: run.tierOcr,
						});
						await db.insert(fileExtractedText).values({
							fileId: file.id,
							workspaceId,
							runId,
							source: "ocr",
							language: result.language ?? null,
							text: result.text,
						});
						ocrStatus = "completed";
					} catch (error) {
						ocrStatus = "failed";
						ocrError = error instanceof Error ? error.message : String(error);
					}
				} else {
					ocrStatus = "skipped";
					ocrError = "inference_service_not_configured";
				}
			} else if (isTextMime(file.mimeType)) {
				await db.insert(fileExtractedText).values({
					fileId: file.id,
					workspaceId,
					runId,
					source: "document_extract",
					language: null,
					text: file.name,
				});
				ocrStatus = "completed";
			} else {
				ocrStatus = "skipped";
				ocrError = "unsupported_file_type";
			}

			if (isImageMime(file.mimeType)) {
				if (env.AI_INFERENCE_URL) {
					try {
						const result = await inferObjects({
							fileId: file.id,
							fileName: file.name,
							mimeType: file.mimeType,
							modelTier: run.tierObject,
						});

						if (result.objects.length === 0) {
							objectStatus = "completed";
						} else {
							for (const object of result.objects) {
								await db.insert(fileDetectedObjects).values({
									fileId: file.id,
									workspaceId,
									runId,
									label: object.label,
									confidence: object.confidence,
									bbox: object.bbox,
									count: object.count ?? 1,
								});
							}
							objectStatus = "completed";
						}
					} catch (error) {
						objectStatus = "failed";
						objectError =
							error instanceof Error ? error.message : String(error);
					}
				} else {
					objectStatus = "skipped";
					objectError = "inference_service_not_configured";
				}
			} else {
				objectStatus = "skipped";
				objectError = "unsupported_file_type";
			}

			const statuses = [embeddingStatus, ocrStatus, objectStatus];
			const allSkipped = statuses.every((status) => status === "skipped");
			const hasFailed = statuses.some((status) => status === "failed");
			const runStatus = allSkipped
				? "skipped"
				: hasFailed
					? "failed"
					: "completed";

			await db
				.update(fileAnalysisRuns)
				.set({
					status: runStatus,
					embeddingStatus,
					ocrStatus,
					objectDetectionStatus: objectStatus,
					embeddingError,
					ocrError,
					objectDetectionError: objectError,
					completedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(fileAnalysisRuns.id, runId));

			await refreshWorkspaceAiProgress(db, workspaceId);
			logger.info({
				msg: "File analysis job completed",
				jobId: job.id,
				runId,
				workspaceId,
				fileId,
				runStatus,
				embeddingStatus,
				ocrStatus,
				objectStatus,
			});
		},
		{
			connection: createBullMQConnection(),
			concurrency: 2,
		},
	);

	analysisWorker.on("failed", (job, error) => {
		logger.error({
			msg: "File analysis worker job failed",
			jobId: job?.id,
			runId: job?.data.runId,
			error: error.message,
		});
	});

	logger.info("File analysis worker started");

	return analysisWorker;
}

export async function stopAnalysisWorker(): Promise<void> {
	if (analysisWorker) {
		await analysisWorker.close();
		analysisWorker = null;
	}
}
