import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ConflictError, normalizePath } from "@drivebase/core";
import { env } from "@/config/env";
import type {
	ProviderTransferJobData,
	TransferOperation,
} from "@/queue/transfer/queue";
import type { TransferManifest } from "@/service/file/transfer/transfer-session";
import type { FileTransferCacheManifest } from "./types";

export function getTransferCacheRoot(): string {
	return env.TRANSFER_CACHE_DIR ?? join(env.DATA_DIR, "transfers");
}

export function clampProgress(value: number): number {
	return Math.max(0, Math.min(1, value));
}

export function getTransferProgress(
	downloadedBytes: number,
	uploadedBytes: number,
	totalSize: number,
): number {
	const safeTotal = Math.max(totalSize, 1);
	const downloadProgress = clampProgress(downloadedBytes / safeTotal);
	const uploadProgress = clampProgress(uploadedBytes / safeTotal);
	return clampProgress(downloadProgress * 0.5 + uploadProgress * 0.5);
}

export async function readManifest(
	path: string,
): Promise<FileTransferCacheManifest | null> {
	try {
		const content = await readFile(path, "utf-8");
		return JSON.parse(content) as FileTransferCacheManifest;
	} catch {
		return null;
	}
}

export async function writeManifest(
	path: string,
	manifest: FileTransferCacheManifest,
): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, JSON.stringify(manifest, null, 2), "utf-8");
}

export function normalizeJobData(data: unknown): ProviderTransferJobData {
	const legacy = data as {
		entity?: "transfer" | "file" | "folder";
		targetFolderId?: string | null;
		operation?: TransferOperation;
		fileId?: string;
		targetProviderId?: string;
		folderId?: string;
		transferSessionId?: string;
		jobId: string;
		workspaceId: string;
		userId: string;
		parentJobId?: string;
	};
	if (legacy.entity === "transfer") {
		if (!legacy.transferSessionId || !legacy.operation) {
			throw new Error("Invalid transfer session payload");
		}
		return {
			entity: "transfer",
			jobId: legacy.jobId,
			workspaceId: legacy.workspaceId,
			userId: legacy.userId,
			transferSessionId: legacy.transferSessionId,
			operation: legacy.operation,
			parentJobId: legacy.parentJobId,
		};
	}
	if (legacy.entity === "file") {
		if (!legacy.fileId || !legacy.targetProviderId || !legacy.operation) {
			throw new Error("Invalid file transfer payload");
		}
		return {
			entity: "file",
			jobId: legacy.jobId,
			workspaceId: legacy.workspaceId,
			userId: legacy.userId,
			fileId: legacy.fileId,
			targetProviderId: legacy.targetProviderId,
			targetFolderId: legacy.targetFolderId ?? null,
			operation: legacy.operation,
			parentJobId: legacy.parentJobId,
		};
	}
	if (legacy.entity === "folder") {
		if (!legacy.folderId || !legacy.operation) {
			throw new Error("Invalid folder transfer payload");
		}
		return {
			entity: "folder",
			jobId: legacy.jobId,
			workspaceId: legacy.workspaceId,
			userId: legacy.userId,
			folderId: legacy.folderId,
			targetFolderId: legacy.targetFolderId ?? null,
			operation: legacy.operation,
			parentJobId: legacy.parentJobId,
		};
	}
	if (legacy.entity === "batch") {
		const batchLegacy = data as {
			entity: "batch";
			childJobIds?: string[];
			operation?: TransferOperation;
			jobId: string;
			workspaceId: string;
			userId: string;
			parentJobId?: string;
			sourceFolders?: Array<{
				id: string;
				providerId: string;
				virtualPath: string;
				remoteId: string;
			}>;
		};
		if (!batchLegacy.childJobIds || !batchLegacy.operation) {
			throw new Error("Invalid batch transfer payload");
		}
		return {
			entity: "batch",
			jobId: batchLegacy.jobId,
			workspaceId: batchLegacy.workspaceId,
			userId: batchLegacy.userId,
			childJobIds: batchLegacy.childJobIds,
			operation: batchLegacy.operation,
			parentJobId: batchLegacy.parentJobId,
			sourceFolders: batchLegacy.sourceFolders,
		};
	}

	if (!legacy.fileId || !legacy.targetProviderId) {
		throw new Error("Invalid transfer job payload");
	}

	return {
		entity: "file",
		jobId: legacy.jobId,
		workspaceId: legacy.workspaceId,
		userId: legacy.userId,
		fileId: legacy.fileId,
		targetProviderId: legacy.targetProviderId,
		targetFolderId: legacy.targetFolderId ?? null,
		operation: legacy.operation ?? "cut",
		parentJobId: legacy.parentJobId,
	};
}

export function isNonRetryableTransferError(error: unknown): boolean {
	if (error instanceof ConflictError) {
		return true;
	}
	const message = error instanceof Error ? error.message : String(error);
	return (
		message.includes("already exists at path") ||
		message.startsWith("Invalid transfer")
	);
}

export async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

export function getRelativePath(rootPath: string, value: string): string {
	const normalizedRoot = normalizePath(rootPath);
	const normalizedValue = normalizePath(value);

	if (normalizedValue === normalizedRoot) {
		return "";
	}
	if (normalizedRoot === "/") {
		return normalizedValue.slice(1);
	}
	const prefix = `${normalizedRoot}/`;
	return normalizedValue.startsWith(prefix)
		? normalizedValue.slice(prefix.length)
		: normalizedValue;
}

export function syncManifestCounts(
	manifest: TransferManifest,
): TransferManifest {
	const completedFiles = manifest.files.filter(
		(file) => file.status === "completed",
	).length;
	const failedFiles = manifest.files.filter(
		(file) => file.status === "failed",
	).length;
	const skippedFiles = manifest.files.filter(
		(file) => file.status === "skipped",
	).length;

	return {
		...manifest,
		completedFiles,
		failedFiles,
		skippedFiles,
		totalFiles: manifest.files.length,
	};
}

export function getTransferCompletionMessage(
	manifest: TransferManifest,
): string {
	const parts = [`${manifest.completedFiles} transferred`];

	if (manifest.skippedFiles > 0) {
		parts.push(`${manifest.skippedFiles} skipped`);
	}
	if (manifest.failedFiles > 0) {
		parts.push(`${manifest.failedFiles} failed`);
	}
	if (manifest.hiddenFiles > 0) {
		parts.push(`${manifest.hiddenFiles} hidden`);
	}

	return parts.join(", ");
}
