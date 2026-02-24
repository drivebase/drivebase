import { createHash } from "node:crypto";
import type { Database } from "@drivebase/db";
import {
	fileAnalysisRuns,
	files,
	storageProviders,
	workspaceAiSettings,
} from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { getAnalysisQueue } from "../../queue/analysis-queue";
import { logger } from "../../utils/logger";
import { isEligibleForAiAnalysis } from "./ai-support";
import { refreshWorkspaceAiProgress } from "./ai-settings";

type EnqueueTrigger =
	| "upload"
	| "manual_reprocess"
	| "backfill"
	| "provider_sync";

export async function enqueueFileAnalysis(
	db: Database,
	fileId: string,
	workspaceId: string,
	trigger: EnqueueTrigger = "upload",
	force = false,
): Promise<void> {
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
		return;
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
		return;
	}

	const isEligible = !file.vaultId && isEligibleForAiAnalysis(file.mimeType);

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
		logger.debug({
			msg: "Skipping file analysis with terminal skipped run",
			fileId: file.id,
			workspaceId,
			reason: file.vaultId ? "encrypted_vault_file" : "unsupported_file_type",
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
				embeddingError: file.vaultId
					? "encrypted_vault_file"
					: "unsupported_file_type",
				ocrError: file.vaultId
					? "encrypted_vault_file"
					: "unsupported_file_type",
				objectDetectionError: file.vaultId
					? "encrypted_vault_file"
					: "unsupported_file_type",
				tierEmbedding: settings?.embeddingTier ?? "medium",
				tierOcr: settings?.ocrTier ?? "medium",
				tierObject: settings?.objectTier ?? "medium",
				attemptCount: 1,
				startedAt: new Date(),
				completedAt: new Date(),
			})
			.onConflictDoNothing({ target: fileAnalysisRuns.analysisKey });
		await refreshWorkspaceAiProgress(db, workspaceId);
		return;
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
		return;
	}

	const queue = getAnalysisQueue();
	await queue.add(
		"analyze-file",
		{
			runId: run.id,
			workspaceId,
			fileId: file.id,
		},
		{ jobId: `analysis-${run.analysisKey}` },
	);

	logger.info({
		msg: "Queued file analysis",
		runId: run.id,
		fileId: file.id,
		workspaceId,
	});

	await refreshWorkspaceAiProgress(db, workspaceId);
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
	for (const row of fileRows) {
		await enqueueFileAnalysis(db, row.id, workspaceId, "backfill");
		queued += 1;
	}

	logger.info({
		msg: "Enqueued workspace AI backfill",
		workspaceId,
		totalFiles: fileRows.length,
		queued,
	});

	return queued;
}
