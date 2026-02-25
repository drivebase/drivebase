import { createHash } from "node:crypto";
import type { Database } from "@drivebase/db";
import {
	fileAnalysisRuns,
	files,
	storageProviders,
	workspaceAiProgress,
	workspaceAiSettings,
} from "@drivebase/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import {
	cancelWorkspaceAnalysisJobs,
	getAnalysisQueue,
} from "../../queue/analysis-queue";
import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { isEligibleForAiAnalysis, resolveMaxFileSizeMb } from "./ai-support";
import {
	refreshWorkspaceAiProgress,
	updateWorkspaceAiSettings,
} from "./ai-settings";

type EnqueueTrigger =
	| "upload"
	| "manual_reprocess"
	| "backfill"
	| "provider_sync";

type EnqueueResult =
	| { status: "queued" }
	| { status: "skipped"; reason: string };

export async function enqueueFileAnalysis(
	db: Database,
	fileId: string,
	workspaceId: string,
	trigger: EnqueueTrigger = "upload",
	force = false,
): Promise<EnqueueResult> {
	const [file] = await db
		.select({
			id: files.id,
			name: files.name,
			mimeType: files.mimeType,
			size: files.size,
			hash: files.hash,
			updatedAt: files.updatedAt,
			vaultId: files.vaultId,
		})
		.from(files)
		.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
		.where(
			and(
				eq(files.id, fileId),
				eq(storageProviders.workspaceId, workspaceId),
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
			),
		)
		.limit(1);

	if (!file) {
		logger.debug({
			msg: "Skipping file analysis enqueue: file not found in workspace",
			fileId,
			workspaceId,
		});
		return { status: "skipped", reason: "file_not_found" };
	}

	const [settings] = await db
		.select()
		.from(workspaceAiSettings)
		.where(eq(workspaceAiSettings.workspaceId, workspaceId))
		.limit(1);

	if (settings && !settings.enabled) {
		logger.debug({
			msg: "Skipping file analysis enqueue: AI processing disabled",
			fileId,
			workspaceId,
		});
		return { status: "skipped", reason: "ai_disabled" };
	}

	const maxSizeMb = resolveMaxFileSizeMb(
		settings?.config,
		Number.parseFloat(env.AI_MAX_FILE_SIZE_MB) || 50,
	);
	const maxBytes = Math.floor(maxSizeMb * 1024 * 1024);
	const isOversized = file.size > maxBytes;
	const isEligible =
		!file.vaultId && !isOversized && isEligibleForAiAnalysis(file.mimeType);

	const keyPayload = [
		file.id,
		file.name,
		file.mimeType,
		String(file.size),
		file.hash ?? "",
		file.updatedAt.toISOString(),
		settings?.embeddingTier ?? "medium",
		settings?.ocrTier ?? "medium",
		settings?.objectTier ?? "medium",
		force ? `force:${Date.now()}` : "stable",
		"pipeline:v1",
	].join("|");

	const analysisKey = createHash("sha256").update(keyPayload).digest("hex");

	if (!isEligible || file.vaultId) {
		const skipReason = file.vaultId
			? "encrypted_vault_file"
			: isOversized
				? "file_too_large"
				: "unsupported_file_type";
		logger.debug({
			msg: "Skipping file analysis with terminal skipped run",
			fileId: file.id,
			workspaceId,
			mimeType: file.mimeType,
			reason: skipReason,
			fileSizeBytes: file.size,
			maxAllowedBytes: maxBytes,
		});
		await db
			.insert(fileAnalysisRuns)
			.values({
				fileId: file.id,
				workspaceId,
				analysisKey,
				trigger,
				status: "skipped",
				embeddingStatus: "skipped",
				ocrStatus: "skipped",
				objectDetectionStatus: "skipped",
				embeddingError: skipReason,
				ocrError: skipReason,
				objectDetectionError: skipReason,
				tierEmbedding: settings?.embeddingTier ?? "medium",
				tierOcr: settings?.ocrTier ?? "medium",
				tierObject: settings?.objectTier ?? "medium",
				attemptCount: 1,
				startedAt: new Date(),
				completedAt: new Date(),
			})
			.onConflictDoNothing({ target: fileAnalysisRuns.analysisKey });
		await refreshWorkspaceAiProgress(db, workspaceId);
		return { status: "skipped", reason: skipReason };
	}

	const [run] = await db
		.insert(fileAnalysisRuns)
		.values({
			fileId: file.id,
			workspaceId,
			analysisKey,
			trigger,
			status: "pending",
			embeddingStatus: "pending",
			ocrStatus: "pending",
			objectDetectionStatus: "pending",
			tierEmbedding: settings?.embeddingTier ?? "medium",
			tierOcr: settings?.ocrTier ?? "medium",
			tierObject: settings?.objectTier ?? "medium",
		})
		.onConflictDoNothing({ target: fileAnalysisRuns.analysisKey })
		.returning();

	if (!run) {
		logger.debug({
			msg: "Skipping file analysis enqueue: duplicate analysis key",
			fileId: file.id,
			workspaceId,
		});
		return { status: "skipped", reason: "duplicate_analysis_key" };
	}

	const queue = getAnalysisQueue();
	await queue.add(
		"analyze-file",
		{
			runId: run.id,
			workspaceId,
			fileId: file.id,
		},
		{ jobId: `analysis-${run.id}` },
	);

	logger.info({
		msg: "Queued file analysis",
		runId: run.id,
		fileId: file.id,
		workspaceId,
	});

	await refreshWorkspaceAiProgress(db, workspaceId);
	return { status: "queued" };
}

export async function enqueueWorkspaceBackfill(
	db: Database,
	workspaceId: string,
): Promise<number> {
	const fileRows = await db
		.select({ id: files.id })
		.from(files)
		.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
		.where(
			and(
				eq(storageProviders.workspaceId, workspaceId),
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
			),
		);

	let queued = 0;
	const skippedByReason = new Map<string, number>();
	for (const row of fileRows) {
		const result = await enqueueFileAnalysis(
			db,
			row.id,
			workspaceId,
			"backfill",
		);
		if (result.status === "queued") {
			queued += 1;
			continue;
		}
		skippedByReason.set(
			result.reason,
			(skippedByReason.get(result.reason) ?? 0) + 1,
		);
	}

	logger.info({
		msg: "Enqueued workspace AI backfill",
		workspaceId,
		totalFiles: fileRows.length,
		queued,
		skippedByReason: Object.fromEntries(skippedByReason.entries()),
	});

	return queued;
}

export async function stopWorkspaceAiProcessing(
	db: Database,
	workspaceId: string,
): Promise<void> {
	await updateWorkspaceAiSettings(db, workspaceId, { enabled: false });

	const now = new Date();
	await db
		.update(fileAnalysisRuns)
		.set({
			status: "skipped",
			embeddingStatus: "skipped",
			ocrStatus: "skipped",
			objectDetectionStatus: "skipped",
			embeddingError: "stopped_by_user",
			ocrError: "stopped_by_user",
			objectDetectionError: "stopped_by_user",
			completedAt: now,
			updatedAt: now,
		})
		.where(
			and(
				eq(fileAnalysisRuns.workspaceId, workspaceId),
				inArray(fileAnalysisRuns.status, ["pending"]),
			),
		);

	await cancelWorkspaceAnalysisJobs(workspaceId);
	await refreshWorkspaceAiProgress(db, workspaceId);

	logger.info({
		msg: "Stopped workspace AI processing",
		workspaceId,
	});
}

export async function deleteWorkspaceAiData(
	db: Database,
	workspaceId: string,
): Promise<void> {
	await stopWorkspaceAiProcessing(db, workspaceId);
	await db
		.delete(fileAnalysisRuns)
		.where(eq(fileAnalysisRuns.workspaceId, workspaceId));
	await db
		.delete(workspaceAiProgress)
		.where(eq(workspaceAiProgress.workspaceId, workspaceId));
	await refreshWorkspaceAiProgress(db, workspaceId);

	logger.info({
		msg: "Deleted workspace AI data",
		workspaceId,
	});
}

export async function retryWorkspaceFailedAiFiles(
	db: Database,
	workspaceId: string,
): Promise<number> {
	const rows = await db.execute(sql`
		with latest_runs as (
			select distinct on (far.file_id)
				far.file_id,
				far.status
			from file_analysis_runs far
			where far.workspace_id = ${workspaceId}
			order by far.file_id, far.created_at desc
		)
		select file_id
		from latest_runs
		where status = 'failed'
	`);

	const fileIds = rows.rows
		.map((row) => (row as { file_id?: unknown }).file_id)
		.filter((fileId): fileId is string => typeof fileId === "string");

	let queued = 0;
	const skippedByReason = new Map<string, number>();
	for (const fileId of fileIds) {
		const result = await enqueueFileAnalysis(
			db,
			fileId,
			workspaceId,
			"manual_reprocess",
			true,
		);
		if (result.status === "queued") {
			queued += 1;
			continue;
		}
		skippedByReason.set(
			result.reason,
			(skippedByReason.get(result.reason) ?? 0) + 1,
		);
	}

	logger.info({
		msg: "Retried failed workspace AI files",
		workspaceId,
		totalFailed: fileIds.length,
		queued,
		skippedByReason: Object.fromEntries(skippedByReason.entries()),
	});

	return queued;
}
