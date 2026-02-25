import {
	fileAnalysisRuns,
	fileDetectedObjects,
	fileEmbeddings,
	fileExtractedText,
	fileTextChunks,
	files,
	getDb,
	storageProviders,
	workspaceAiSettings,
} from "@drivebase/db";
import { Worker } from "bullmq";
import { and, eq } from "drizzle-orm";
import { env } from "../config/env";
import { createBullMQConnection } from "../redis/client";
import { getAnalysisQueue } from "./analysis-queue";
import { refreshWorkspaceAiProgress } from "../services/ai/ai-settings";
import {
	inferEmbeddingStream,
	inferObjectsStream,
	inferOcrStream,
	inferTextEmbedding,
} from "../services/ai/inference-client";
import { getProviderInstance } from "../services/provider/provider-queries";
import { resolveMaxFileSizeMb } from "../services/ai/ai-support";
import { logger } from "../utils/logger";
import type { FileAnalysisJobData } from "./analysis-queue";

let analysisWorker: Worker<FileAnalysisJobData> | null = null;

function toErrorDetails(error: unknown) {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack,
		};
	}
	return { message: String(error) };
}

async function recoverPendingRuns(limit = 1000): Promise<void> {
	const db = getDb();
	const queue = getAnalysisQueue();
	const pendingRuns = await db
		.select({
			id: fileAnalysisRuns.id,
			analysisKey: fileAnalysisRuns.analysisKey,
			workspaceId: fileAnalysisRuns.workspaceId,
			fileId: fileAnalysisRuns.fileId,
		})
		.from(fileAnalysisRuns)
		.where(eq(fileAnalysisRuns.status, "pending"))
		.limit(limit);

	let requeued = 0;
	for (const run of pendingRuns) {
		try {
			await queue.add(
				"analyze-file",
				{
					runId: run.id,
					workspaceId: run.workspaceId,
					fileId: run.fileId,
				},
				{ jobId: `analysis-${run.id}` },
			);
			requeued += 1;
		} catch (error) {
			// Ignore duplicate job id conflicts; those are already queued.
			const message = error instanceof Error ? error.message : String(error);
			if (!message.toLowerCase().includes("jobid")) {
				logger.warn({
					msg: "Failed to requeue pending analysis run",
					runId: run.id,
					workspaceId: run.workspaceId,
					fileId: run.fileId,
					error: message,
				});
			}
		}
	}

	logger.info({
		msg: "Recovered pending analysis runs",
		pendingFound: pendingRuns.length,
		requeued,
	});
}

async function ensureAnalysisQueueActive(): Promise<void> {
	const queue = getAnalysisQueue();
	try {
		await queue.resume();
		const counts = await queue.getJobCounts(
			"waiting",
			"active",
			"delayed",
			"paused",
			"prioritized",
		);
		logger.info({
			msg: "Analysis queue is active",
			counts,
		});
	} catch (error) {
		logger.warn({
			msg: "Failed to ensure analysis queue active",
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

function isImageMime(mimeType: string): boolean {
	return mimeType.toLowerCase().startsWith("image/");
}

function isPdfMime(mimeType: string): boolean {
	return mimeType.toLowerCase() === "application/pdf";
}

function isDocxMime(mimeType: string): boolean {
	return (
		mimeType.toLowerCase() ===
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	);
}

function isTextMime(mimeType: string): boolean {
	const normalized = mimeType.toLowerCase();
	return (
		normalized.startsWith("text/") ||
		normalized === "application/json" ||
		normalized === "application/csv"
	);
}

function chunkText(
	text: string,
	maxChars = 900,
	overlap = 120,
	minChars = 80,
): string[] {
	const normalized = text.replace(/\s+/g, " ").trim();
	if (!normalized) return [];
	if (normalized.length <= maxChars) return [normalized];

	const chunks: string[] = [];
	let start = 0;

	while (start < normalized.length) {
		const idealEnd = Math.min(start + maxChars, normalized.length);
		let end = idealEnd;

		if (idealEnd < normalized.length) {
			const breakAt = normalized.lastIndexOf(" ", idealEnd);
			if (breakAt > start + minChars) {
				end = breakAt;
			}
		}

		const chunk = normalized.slice(start, end).trim();
		if (chunk.length >= minChars) {
			chunks.push(chunk);
		}

		if (end >= normalized.length) break;
		const nextStart = Math.max(0, end - overlap);
		if (nextStart <= start) break;
		start = nextStart;
	}

	return chunks;
}

async function readTextFromProvider(input: {
	providerId: string;
	workspaceId: string;
	remoteId: string;
}): Promise<string | null> {
	const { stream, provider } = await streamFromProvider(input);
	try {
		const text = await new Response(stream).text();
		return text.trim();
	} catch {
		return null;
	} finally {
		await provider.cleanup().catch(() => undefined);
	}
}

async function persistChunkEmbeddings(input: {
	db: ReturnType<typeof getDb>;
	fileId: string;
	workspaceId: string;
	runId: string;
	source: string;
	text: string;
	modelTier: "lightweight" | "medium" | "heavy";
}): Promise<void> {
	if (!env.AI_INFERENCE_URL) {
		return;
	}

	const chunks = chunkText(input.text);
	if (chunks.length === 0) return;

	for (const [chunkIndex, chunk] of chunks.entries()) {
		const embed = await inferTextEmbedding({
			text: chunk,
			modelTier: input.modelTier,
		});
		await input.db.insert(fileTextChunks).values({
			fileId: input.fileId,
			workspaceId: input.workspaceId,
			runId: input.runId,
			source: input.source,
			chunkIndex,
			text: chunk,
			modelName: embed.modelName,
			modelTier: input.modelTier,
			embedding: embed.embedding,
		});
	}
}

async function streamFromProvider(input: {
	providerId: string;
	workspaceId: string;
	remoteId: string;
}) {
	const db = getDb();
	const [providerRecord] = await db
		.select()
		.from(storageProviders)
		.where(
			and(
				eq(storageProviders.id, input.providerId),
				eq(storageProviders.workspaceId, input.workspaceId),
			),
		)
		.limit(1);

	if (!providerRecord) {
		throw new Error("Provider not found for analysis stream");
	}

	const provider = await getProviderInstance(providerRecord);
	try {
		const stream = await provider.downloadFile(input.remoteId);
		return { stream, provider };
	} catch (error) {
		await provider.cleanup().catch(() => undefined);
		throw error;
	}
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
					size: files.size,
					providerId: files.providerId,
					remoteId: files.remoteId,
				})
				.from(files)
				.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
				.where(
					and(
						eq(files.id, fileId),
						eq(storageProviders.workspaceId, workspaceId),
						eq(files.nodeType, "file"),
					),
				)
				.limit(1);

			if (!file) {
				logger.error({
					msg: "Analysis worker file lookup failed",
					jobId: job.id,
					runId,
					workspaceId,
					fileId,
				});
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

			const [settings] = await db
				.select()
				.from(workspaceAiSettings)
				.where(eq(workspaceAiSettings.workspaceId, workspaceId))
				.limit(1);

			const maxSizeMb = resolveMaxFileSizeMb(
				settings?.config,
				Number.parseFloat(env.AI_MAX_FILE_SIZE_MB) || 50,
			);
			if (settings && !settings.enabled) {
				const reason = "ai_processing_disabled";
				await db
					.update(fileAnalysisRuns)
					.set({
						status: "skipped",
						embeddingStatus: "skipped",
						ocrStatus: "skipped",
						objectDetectionStatus: "skipped",
						embeddingError: reason,
						ocrError: reason,
						objectDetectionError: reason,
						completedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(fileAnalysisRuns.id, runId));
				await refreshWorkspaceAiProgress(db, workspaceId);
				logger.info({
					msg: "Skipping analysis because workspace AI is disabled",
					jobId: job.id,
					runId,
					workspaceId,
					fileId,
				});
				return;
			}
			const maxBytes = Math.floor(maxSizeMb * 1024 * 1024);
			if (file.size > maxBytes) {
				const reason = `file_too_large:${file.size}>${maxBytes}`;
				await db
					.update(fileAnalysisRuns)
					.set({
						status: "skipped",
						embeddingStatus: "skipped",
						ocrStatus: "skipped",
						objectDetectionStatus: "skipped",
						embeddingError: reason,
						ocrError: reason,
						objectDetectionError: reason,
						completedAt: new Date(),
						updatedAt: new Date(),
					})
					.where(eq(fileAnalysisRuns.id, runId));
				await refreshWorkspaceAiProgress(db, workspaceId);
				logger.info({
					msg: "Skipping analysis for oversized file",
					jobId: job.id,
					runId,
					workspaceId,
					fileId,
					fileSizeBytes: file.size,
					maxAllowedBytes: maxBytes,
				});
				return;
			}

			if (env.AI_INFERENCE_URL) {
				try {
					const startedAt = Date.now();
					logger.debug({
						msg: "Starting embedding inference stream",
						runId,
						fileId,
						mimeType: file.mimeType,
						fileSizeBytes: file.size,
					});
					const { stream, provider } = await streamFromProvider({
						providerId: file.providerId,
						workspaceId,
						remoteId: file.remoteId,
					});
					const embedding = await (async () => {
						try {
							return await inferEmbeddingStream({
								stream,
								fileName: file.name,
								mimeType: file.mimeType,
								modelTier: run.tierEmbedding,
							});
						} finally {
							await provider.cleanup().catch(() => undefined);
						}
					})();

					await db.insert(fileEmbeddings).values({
						fileId: file.id,
						workspaceId,
						runId,
						modelName: embedding.modelName,
						modelTier: run.tierEmbedding,
						embedding: embedding.embedding,
					});
					logger.debug({
						msg: "Embedding inference stream completed",
						runId,
						fileId,
						durationMs: Date.now() - startedAt,
					});
					embeddingStatus = "completed";
				} catch (error) {
					embeddingStatus = "failed";
					embeddingError =
						error instanceof Error ? error.message : String(error);
					logger.warn({
						msg: "Embedding inference failed",
						runId,
						fileId,
						error: toErrorDetails(error),
					});
				}
			} else {
				embeddingStatus = "skipped";
				embeddingError = "inference_service_not_configured";
				logger.warn({
					msg: "Skipping embedding inference: AI inference URL not configured",
					runId,
					fileId,
				});
			}

			const canOcr =
				isImageMime(file.mimeType) ||
				isPdfMime(file.mimeType) ||
				isDocxMime(file.mimeType);
			if (canOcr) {
				if (env.AI_INFERENCE_URL) {
					try {
						const startedAt = Date.now();
						logger.debug({
							msg: "Starting OCR inference stream",
							runId,
							fileId,
							mimeType: file.mimeType,
							fileSizeBytes: file.size,
						});
						const { stream, provider } = await streamFromProvider({
							providerId: file.providerId,
							workspaceId,
							remoteId: file.remoteId,
						});
						const result = await (async () => {
							try {
								return await inferOcrStream({
									stream,
									fileName: file.name,
									mimeType: file.mimeType,
									modelTier: run.tierOcr,
								});
							} finally {
								await provider.cleanup().catch(() => undefined);
							}
						})();
						await db.insert(fileExtractedText).values({
							fileId: file.id,
							workspaceId,
							runId,
							source: result.source ?? "ocr",
							language: result.language ?? null,
							text: result.text,
						});
						try {
							await persistChunkEmbeddings({
								db,
								fileId: file.id,
								workspaceId,
								runId,
								source: result.source ?? "ocr",
								text: result.text,
								modelTier: run.tierEmbedding,
							});
						} catch (error) {
							logger.warn({
								msg: "Failed to persist OCR chunk embeddings",
								runId,
								fileId,
								error: toErrorDetails(error),
							});
						}
						logger.debug({
							msg: "OCR inference stream completed",
							runId,
							fileId,
							durationMs: Date.now() - startedAt,
						});
						ocrStatus = "completed";
					} catch (error) {
						ocrStatus = "failed";
						ocrError = error instanceof Error ? error.message : String(error);
						logger.warn({
							msg: "OCR inference failed",
							runId,
							fileId,
							error: toErrorDetails(error),
						});
					}
				} else {
					ocrStatus = "skipped";
					ocrError = "inference_service_not_configured";
					logger.warn({
						msg: "Skipping OCR inference: AI inference URL not configured",
						runId,
						fileId,
					});
				}
			} else if (isTextMime(file.mimeType)) {
				const extractedText =
					(await readTextFromProvider({
						providerId: file.providerId,
						workspaceId,
						remoteId: file.remoteId,
					})) ?? file.name;
				await db.insert(fileExtractedText).values({
					fileId: file.id,
					workspaceId,
					runId,
					source: "document_extract",
					language: null,
					text: extractedText,
				});
				try {
					await persistChunkEmbeddings({
						db,
						fileId: file.id,
						workspaceId,
						runId,
						source: "document_extract",
						text: extractedText,
						modelTier: run.tierEmbedding,
					});
				} catch (error) {
					logger.warn({
						msg: "Failed to persist text chunk embeddings",
						runId,
						fileId,
						error: toErrorDetails(error),
					});
				}
				ocrStatus = "completed";
			} else {
				ocrStatus = "skipped";
				ocrError = "unsupported_file_type";
			}

			if (isImageMime(file.mimeType)) {
				if (env.AI_INFERENCE_URL) {
					try {
						const startedAt = Date.now();
						logger.debug({
							msg: "Starting object inference stream",
							runId,
							fileId,
							mimeType: file.mimeType,
							fileSizeBytes: file.size,
						});
						const { stream, provider } = await streamFromProvider({
							providerId: file.providerId,
							workspaceId,
							remoteId: file.remoteId,
						});
						const result = await (async () => {
							try {
								return await inferObjectsStream({
									stream,
									fileName: file.name,
									mimeType: file.mimeType,
									modelTier: run.tierObject,
								});
							} finally {
								await provider.cleanup().catch(() => undefined);
							}
						})();

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
						logger.debug({
							msg: "Object inference stream completed",
							runId,
							fileId,
							durationMs: Date.now() - startedAt,
							objectCount: result.objects.length,
						});
					} catch (error) {
						objectStatus = "failed";
						objectError =
							error instanceof Error ? error.message : String(error);
						logger.warn({
							msg: "Object inference failed",
							runId,
							fileId,
							error: toErrorDetails(error),
						});
					}
				} else {
					objectStatus = "skipped";
					objectError = "inference_service_not_configured";
					logger.warn({
						msg: "Skipping object inference: AI inference URL not configured",
						runId,
						fileId,
					});
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
			if (runStatus === "failed") {
				logger.error({
					msg: "File analysis run failed",
					jobId: job.id,
					runId,
					workspaceId,
					fileId,
					embeddingError,
					ocrError,
					objectError,
				});
			}
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
			error: toErrorDetails(error),
		});
	});
	analysisWorker.on("error", (error) => {
		logger.error({
			msg: "File analysis worker error",
			error: error.message,
		});
	});

	logger.info("File analysis worker started");
	void ensureAnalysisQueueActive();
	void recoverPendingRuns();

	return analysisWorker;
}

export async function stopAnalysisWorker(): Promise<void> {
	if (analysisWorker) {
		await analysisWorker.close();
		analysisWorker = null;
	}
}
