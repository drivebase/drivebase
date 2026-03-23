import type { Database } from "@drivebase/db";
import { eq } from "drizzle-orm";
import {
	type NewTransferSession,
	type TransferSession,
	transferSessions,
} from "@drivebase/db";

export type TransferOperation = "cut" | "copy";
export type TransferConflictAction = "duplicate" | "overwrite" | "skip";

export interface TransferSourceItem {
	kind: "file" | "folder";
	id: string;
}

export interface TransferRootEntry {
	id: string;
	kind: "folder";
	sourceFolderId: string;
	sourceProviderId: string;
	sourceVirtualPath: string;
	sourceRemoteId: string;
	originalName: string;
	resolvedName: string;
	status: "pending" | "skipped";
}

export interface TransferFileEntry {
	id: string;
	sourceFileId: string;
	sourceProviderId: string;
	sourceVirtualPath: string;
	sourceRootId: string | null;
	name: string;
	relativeDirPath: string;
	status: "pending" | "completed" | "skipped" | "failed";
	errorMessage?: string;
	finalDestinationPath?: string;
	isHidden: boolean;
}

export interface TransferFolderEntry {
	id: string;
	sourceFolderId: string;
	sourceProviderId: string;
	sourceVirtualPath: string;
	sourceRootId: string;
	name: string;
	relativePath: string;
	status: "pending" | "completed" | "skipped";
}

export interface TransferConflictState {
	kind: "folder-root" | "file";
	currentPath: string;
	fileName?: string;
	rootId?: string;
	allowedResolutions: TransferConflictAction[];
}

export interface TransferManifest {
	targetFolderId: string | null;
	targetProviderId: string;
	roots: TransferRootEntry[];
	folders: TransferFolderEntry[];
	files: TransferFileEntry[];
	preflightComplete?: boolean;
	completedFiles: number;
	failedFiles: number;
	skippedFiles: number;
	totalFiles: number;
	hiddenFiles: number;
	applyToAllFileResolution?: TransferConflictAction | null;
	currentConflict?: TransferConflictState | null;
}

export interface CreateTransferSessionInput {
	workspaceId: string;
	userId: string;
	jobId: string;
	operation: TransferOperation;
	targetFolderId: string | null;
	targetProviderId: string | null;
	sourceItems: TransferSourceItem[];
}

function fromJson<T>(value: unknown): T | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as T;
}

export async function createTransferSession(
	db: Database,
	input: CreateTransferSessionInput,
) {
	const [session] = await db
		.insert(transferSessions)
		.values({
			workspaceId: input.workspaceId,
			userId: input.userId,
			jobId: input.jobId,
			operation: input.operation,
			targetFolderId: input.targetFolderId,
			targetProviderId: input.targetProviderId,
			sourceItems:
				input.sourceItems as unknown as NewTransferSession["sourceItems"],
		})
		.returning();

	if (!session) {
		throw new Error("Failed to create transfer session");
	}

	return session;
}

export async function getTransferSessionById(
	db: Database,
	sessionId: string,
): Promise<
	| (TransferSession & {
			manifestData: TransferManifest | null;
			sourceItemsData: TransferSourceItem[];
	  })
	| null
> {
	const [session] = await db
		.select()
		.from(transferSessions)
		.where(eq(transferSessions.id, sessionId))
		.limit(1);

	if (!session) {
		return null;
	}

	return {
		...session,
		manifestData: fromJson<TransferManifest>(session.manifest),
		sourceItemsData: Array.isArray(session.sourceItems)
			? (session.sourceItems as unknown as TransferSourceItem[])
			: [],
	};
}

export async function updateTransferSession(
	db: Database,
	sessionId: string,
	input: Partial<{
		status: TransferSession["status"];
		manifest: TransferManifest | null;
	}>,
) {
	const [session] = await db
		.update(transferSessions)
		.set({
			...(input.status !== undefined ? { status: input.status } : {}),
			...(input.manifest !== undefined
				? {
						manifest:
							input.manifest as unknown as NewTransferSession["manifest"],
					}
				: {}),
			updatedAt: new Date(),
		})
		.where(eq(transferSessions.id, sessionId))
		.returning();

	if (!session) {
		throw new Error("Transfer session not found");
	}

	return session;
}
