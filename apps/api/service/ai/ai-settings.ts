import type { Database } from "@drivebase/db";
import {
	type analysisModelTierEnum,
	fileAnalysisRuns,
	files,
	storageProviders,
	workspaceAiProgress,
	workspaceAiSettings,
} from "@drivebase/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { env } from "../../config/env";
import { pubSub } from "../../graphql/pubsub";
import { isEligibleForAiAnalysis, resolveMaxFileSizeMb } from "./ai-support";

type AnalysisModelTier = (typeof analysisModelTierEnum.enumValues)[number];

export interface WorkspaceAiSettingsInput {
	enabled?: boolean;
	embeddingTier?: AnalysisModelTier;
	ocrTier?: AnalysisModelTier;
	maxConcurrency?: number;
	config?: Record<string, unknown>;
}

export async function getOrCreateWorkspaceAiSettings(
	db: Database,
	workspaceId: string,
) {
	const [existing] = await db
		.select()
		.from(workspaceAiSettings)
		.where(eq(workspaceAiSettings.workspaceId, workspaceId))
		.limit(1);

	if (existing) return existing;

	const [created] = await db
		.insert(workspaceAiSettings)
		.values({ workspaceId })
		.returning();

	if (!created) {
		throw new Error("Failed to create workspace AI settings");
	}

	return created;
}

export async function updateWorkspaceAiSettings(
	db: Database,
	workspaceId: string,
	input: WorkspaceAiSettingsInput,
) {
	const existing = await getOrCreateWorkspaceAiSettings(db, workspaceId);

	const [updated] = await db
		.update(workspaceAiSettings)
		.set({
			enabled: input.enabled ?? existing.enabled,
			embeddingTier: input.embeddingTier ?? existing.embeddingTier,
			ocrTier: input.ocrTier ?? existing.ocrTier,
			maxConcurrency: input.maxConcurrency ?? existing.maxConcurrency,
			config: input.config ?? existing.config,
			updatedAt: new Date(),
		})
		.where(eq(workspaceAiSettings.workspaceId, workspaceId))
		.returning();

	if (!updated) {
		throw new Error("Failed to update workspace AI settings");
	}

	return updated;
}

export async function refreshWorkspaceAiProgress(
	db: Database,
	workspaceId: string,
) {
	const fileRows = await db
		.select({
			id: files.id,
			mimeType: files.mimeType,
			size: files.size,
		})
		.from(files)
		.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
		.where(
			and(
				eq(storageProviders.workspaceId, workspaceId),
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
				isNull(files.vaultId),
			),
		);

	const [settings] = await db
		.select()
		.from(workspaceAiSettings)
		.where(eq(workspaceAiSettings.workspaceId, workspaceId))
		.limit(1);
	const maxSizeMb = resolveMaxFileSizeMb(
		settings?.config,
		Number.parseFloat(env.AI_MAX_FILE_SIZE_MB) || 50,
	);
	const maxBytes = Math.floor(maxSizeMb * 1024 * 1024);

	const eligibleFileIds = new Set<string>();
	let eligibleFiles = 0;
	for (const row of fileRows) {
		if (isEligibleForAiAnalysis(row.mimeType) && row.size <= maxBytes) {
			eligibleFiles += 1;
			eligibleFileIds.add(row.id);
		}
	}

	const [existing] = await db
		.select()
		.from(workspaceAiProgress)
		.where(eq(workspaceAiProgress.workspaceId, workspaceId))
		.limit(1);

	const runRows = await db
		.select({
			fileId: fileAnalysisRuns.fileId,
			status: fileAnalysisRuns.status,
			createdAt: fileAnalysisRuns.createdAt,
		})
		.from(fileAnalysisRuns)
		.where(eq(fileAnalysisRuns.workspaceId, workspaceId))
		.orderBy(desc(fileAnalysisRuns.createdAt));

	const latestByFile = new Map<string, (typeof runRows)[number]["status"]>();
	for (const row of runRows) {
		if (!eligibleFileIds.has(row.fileId)) {
			continue;
		}
		if (!latestByFile.has(row.fileId)) {
			latestByFile.set(row.fileId, row.status);
		}
	}

	const aggregate = {
		pendingFiles: 0,
		runningFiles: 0,
		failedFiles: 0,
		skippedFiles: 0,
		completedFiles: 0,
		processedFiles: 0,
	};
	for (const status of latestByFile.values()) {
		if (status === "pending") aggregate.pendingFiles += 1;
		if (status === "running") aggregate.runningFiles += 1;
		if (status === "failed") aggregate.failedFiles += 1;
		if (status === "skipped") aggregate.skippedFiles += 1;
		if (status === "completed") aggregate.completedFiles += 1;
		if (status === "completed" || status === "failed" || status === "skipped") {
			aggregate.processedFiles += 1;
		}
	}

	const processedFiles = Math.min(aggregate.processedFiles, eligibleFiles);
	const completionPct =
		eligibleFiles <= 0
			? 0
			: Math.round((processedFiles / eligibleFiles) * 10000) / 100;

	if (!existing) {
		const [created] = await db
			.insert(workspaceAiProgress)
			.values({
				workspaceId,
				eligibleFiles,
				processedFiles,
				pendingFiles: aggregate.pendingFiles,
				runningFiles: aggregate.runningFiles,
				failedFiles: aggregate.failedFiles,
				skippedFiles: aggregate.skippedFiles,
				completedFiles: aggregate.completedFiles,
				completionPct,
			})
			.returning();

		if (!created) {
			throw new Error("Failed to create workspace AI progress");
		}
		await pubSub.publish("workspaceAiProgressUpdated", workspaceId, created);

		return created;
	}

	const hasChanged =
		existing.eligibleFiles !== eligibleFiles ||
		existing.processedFiles !== processedFiles ||
		existing.pendingFiles !== aggregate.pendingFiles ||
		existing.runningFiles !== aggregate.runningFiles ||
		existing.failedFiles !== aggregate.failedFiles ||
		existing.skippedFiles !== aggregate.skippedFiles ||
		existing.completedFiles !== aggregate.completedFiles ||
		existing.completionPct !== completionPct;

	if (!hasChanged) {
		return existing;
	}

	const [updated] = await db
		.update(workspaceAiProgress)
		.set({
			eligibleFiles,
			processedFiles,
			pendingFiles: aggregate.pendingFiles,
			runningFiles: aggregate.runningFiles,
			failedFiles: aggregate.failedFiles,
			skippedFiles: aggregate.skippedFiles,
			completedFiles: aggregate.completedFiles,
			completionPct,
			updatedAt: new Date(),
		})
		.where(eq(workspaceAiProgress.workspaceId, workspaceId))
		.returning();

	if (!updated) {
		throw new Error("Failed to update workspace AI progress");
	}
	await pubSub.publish("workspaceAiProgressUpdated", workspaceId, updated);

	return updated;
}

export async function getWorkspaceAiProgress(
	db: Database,
	workspaceId: string,
) {
	return refreshWorkspaceAiProgress(db, workspaceId);
}
