import { NotFoundError } from "@drivebase/core";
import {
	fileContents,
	files,
	getDb,
	jobs,
	storageProviders,
} from "@drivebase/db";
import { Worker } from "bullmq";
import { and, eq, sql } from "drizzle-orm";
import { createBullMQConnection } from "../redis/client";
import { ActivityService } from "../service/activity";
import { getProviderInstance } from "../service/provider/query";
import {
	getExtractor,
	isExtractionSupported,
	isWithinSizeLimit,
} from "../utils/extraction";
import { assertNotCancelled, JobCancelledError } from "../utils/job-cancel";
import { logger } from "../utils/logger";
import type { ExtractionJobData } from "./extraction-queue";

const MAX_CONCURRENT = 5;

let extractionWorker: Worker<ExtractionJobData> | null = null;

export function startExtractionWorker(): Worker<ExtractionJobData> {
	if (extractionWorker) {
		return extractionWorker;
	}

	extractionWorker = new Worker<ExtractionJobData>(
		"extraction",
		async (bullJob) => {
			const db = getDb();
			const { nodeId, workspaceId, trackingJobId } = bullJob.data;

			logger.debug({
				msg: "Extraction job started",
				nodeId,
				workspaceId,
				trackingJobId,
				attempt: bullJob.attemptsMade + 1,
			});

			let provider: Awaited<ReturnType<typeof getProviderInstance>> | null =
				null;

			try {
				// Update extraction status to processing
				await db
					.update(fileContents)
					.set({
						extractionStatus: "processing",
						updatedAt: new Date(),
					})
					.where(eq(fileContents.nodeId, nodeId));

				// Fetch the file node
				const [file] = await db
					.select()
					.from(files)
					.where(and(eq(files.id, nodeId), eq(files.nodeType, "file")))
					.limit(1);

				if (!file) {
					logger.debug({ msg: "Extraction skipped: file not found", nodeId });
					await markFailed(db, nodeId, "File not found");
					return;
				}

				logger.debug({
					msg: "Extraction file resolved",
					nodeId,
					name: file.name,
					mimeType: file.mimeType,
					size: file.size,
					providerId: file.providerId,
				});

				if (!isExtractionSupported(file.mimeType)) {
					logger.debug({
						msg: "Extraction skipped: unsupported MIME type",
						nodeId,
						mimeType: file.mimeType,
					});
					await db
						.update(fileContents)
						.set({
							extractionStatus: "unsupported",
							updatedAt: new Date(),
						})
						.where(eq(fileContents.nodeId, nodeId));
					return;
				}

				if (!isWithinSizeLimit(file.size)) {
					logger.debug({
						msg: "Extraction skipped: file exceeds size limit",
						nodeId,
						size: file.size,
					});
					await markFailed(db, nodeId, "File exceeds size limit (100MB)");
					return;
				}

				const extractor = getExtractor(file.mimeType);
				if (!extractor) {
					await markFailed(db, nodeId, "No extractor available");
					return;
				}

				// Download file from provider
				const [providerRecord] = await db
					.select()
					.from(storageProviders)
					.where(eq(storageProviders.id, file.providerId))
					.limit(1);

				if (!providerRecord) {
					throw new NotFoundError("Provider");
				}

				provider = await getProviderInstance(providerRecord);

				// Check cancellation before download
				if (trackingJobId) await assertNotCancelled(trackingJobId);

				logger.debug({
					msg: "Downloading file from provider",
					nodeId,
					remoteId: file.remoteId,
					providerType: providerRecord.type,
				});

				const stream = await provider.downloadFile(file.remoteId);
				const buffer = Buffer.from(await streamToArrayBuffer(stream));

				logger.debug({
					msg: "File downloaded, starting extraction",
					nodeId,
					bufferSize: buffer.length,
					mimeType: file.mimeType,
				});

				// Check cancellation before extraction
				if (trackingJobId) await assertNotCancelled(trackingJobId);

				// Extract text
				const result = await extractor(buffer, file.mimeType);
				const wordCount = result.text
					? result.text.split(/\s+/).filter(Boolean).length
					: 0;

				logger.debug({
					msg: "Text extraction complete",
					nodeId,
					method: result.method,
					wordCount,
					pageCount: result.pageCount,
					textLength: result.text.length,
				});

				// Store extracted text and update search vector
				await db
					.update(fileContents)
					.set({
						extractedText: result.text,
						searchVector: sql`to_tsvector('english', ${result.text || ""})`,
						extractionMethod: result.method,
						extractionStatus: "completed",
						pageCount: result.pageCount ?? null,
						wordCount,
						updatedAt: new Date(),
					})
					.where(eq(fileContents.nodeId, nodeId));

				// Update tracking job progress if this is part of a bulk indexing
				if (trackingJobId) {
					await updateTrackingJobProgress(db, trackingJobId);
				}

				logger.info({
					msg: "Content extracted",
					nodeId,
					method: result.method,
					wordCount,
				});
			} catch (error) {
				if (error instanceof JobCancelledError) {
					logger.debug({ msg: "Extraction cancelled", nodeId, trackingJobId });
					await db
						.update(fileContents)
						.set({
							extractionStatus: "pending",
							updatedAt: new Date(),
						})
						.where(eq(fileContents.nodeId, nodeId));
					return;
				}

				const message = error instanceof Error ? error.message : String(error);
				logger.error({
					msg: "Extraction job failed",
					nodeId,
					workspaceId,
					error: message,
				});
				await markFailed(db, nodeId, message);

				if (trackingJobId) {
					await updateTrackingJobProgress(db, trackingJobId);
				}

				throw error;
			} finally {
				if (provider) {
					await provider.cleanup().catch(() => {});
				}
			}
		},
		{
			connection: createBullMQConnection(),
			concurrency: MAX_CONCURRENT,
		},
	);

	extractionWorker.on("failed", (job, error) => {
		logger.error({
			msg: "Extraction worker job failed",
			jobId: job?.id,
			error: error.message,
		});
	});

	logger.info("Extraction worker started");
	return extractionWorker;
}

export async function stopExtractionWorker(): Promise<void> {
	if (extractionWorker) {
		await extractionWorker.close();
		extractionWorker = null;
		logger.info("Extraction worker stopped");
	}
}

async function markFailed(
	db: ReturnType<typeof getDb>,
	nodeId: string,
	message: string,
): Promise<void> {
	await db
		.update(fileContents)
		.set({
			extractionStatus: "failed",
			errorMessage: message,
			updatedAt: new Date(),
		})
		.where(eq(fileContents.nodeId, nodeId));
}

async function updateTrackingJobProgress(
	db: ReturnType<typeof getDb>,
	trackingJobId: string,
): Promise<void> {
	const [job] = await db
		.select()
		.from(jobs)
		.where(eq(jobs.id, trackingJobId))
		.limit(1);

	if (!job?.metadata) return;

	const metadata = job.metadata as { totalFiles?: number };
	const totalFiles = metadata.totalFiles ?? 0;
	if (totalFiles === 0) return;

	// Count completed/failed extractions for this workspace
	const [result] = await db
		.select({
			completed: sql<number>`count(*) filter (where ${fileContents.extractionStatus} in ('completed', 'failed', 'unsupported'))`,
		})
		.from(fileContents)
		.where(eq(fileContents.workspaceId, job.workspaceId));

	const processed = Number(result?.completed ?? 0);
	const progress = Math.min(processed / totalFiles, 1);
	const isComplete = progress >= 1;

	logger.debug({
		msg: "Tracking job progress updated",
		trackingJobId,
		processed,
		totalFiles,
		progress: Math.round(progress * 100),
		isComplete,
	});

	// Use ActivityService to publish progress via PubSub
	const activityService = new ActivityService(db);
	if (isComplete) {
		await activityService.complete(
			trackingJobId,
			`Indexed ${processed} of ${totalFiles} files`,
		);
	} else {
		await activityService.update(trackingJobId, {
			progress,
			message: `Indexed ${processed} of ${totalFiles} files`,
			status: "running",
		});
	}
}

async function streamToArrayBuffer(
	stream: ReadableStream,
): Promise<ArrayBuffer> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	let done = false;

	while (!done) {
		const result = await reader.read();
		done = result.done;
		if (result.value) {
			chunks.push(result.value);
		}
	}

	const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
	const merged = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		merged.set(chunk, offset);
		offset += chunk.length;
	}

	return merged.buffer;
}
