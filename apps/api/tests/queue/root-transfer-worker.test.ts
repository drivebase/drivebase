import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { rm } from "node:fs/promises";
import { join } from "node:path";

const TRANSFER_CACHE = join(
	process.env.TMPDIR ?? "/tmp",
	"drivebase-root-transfer-tests",
);

let activeDb: ReturnType<typeof buildMockDb>;
const getFileMock = mock(async () => ({
	id: "file-1",
	name: ".env",
	virtualPath: "/Folder/.env",
	mimeType: "text/plain",
	size: 3,
	hash: "hash-1",
	remoteId: "source-file-remote",
	providerId: "source-provider",
	workspaceId: "ws-1",
	folderId: "folder-1",
	nodeType: "file" as const,
	isDeleted: false,
}));

const getTransferSessionById = mock();
const updateTransferSession = mock();
const waitForJobResolution = mock();

function buildMockDb(input: {
	limitResults?: unknown[][];
	returningResults?: unknown[][];
}) {
	const limitQueue = [...(input.limitResults ?? [])];
	const returningQueue = [...(input.returningResults ?? [])];

	const nextLimit = async () => {
		if (limitQueue.length === 0) {
			throw new Error("Unexpected db.limit() call");
		}
		return limitQueue.shift() ?? [];
	};

	const nextReturning = async () => {
		if (returningQueue.length === 0) {
			throw new Error("Unexpected db.returning() call");
		}
		return returningQueue.shift() ?? [];
	};

	const selectChain: any = {
		from: () => selectChain,
		where: () => selectChain,
		orderBy: () => selectChain,
		limit: nextLimit,
	};

	return {
		db: {
			select: () => selectChain,
			insert: () => ({
				values: () => ({
					returning: nextReturning,
				}),
			}),
			update: () => ({
				set: () => ({
					where: () => ({
						returning: nextReturning,
					}),
				}),
			}),
			delete: () => ({
				where: async () => undefined,
			}),
		},
	};
}

mock.module("@drivebase/db", () => ({
	getDb: () => {
		if (!activeDb) {
			throw new Error("Mock DB not initialized");
		}
		return activeDb.db;
	},
	files: {
		id: "files.id",
		nodeType: "files.nodeType",
		virtualPath: "files.virtualPath",
		providerId: "files.providerId",
		isDeleted: "files.isDeleted",
		workspaceId: "files.workspaceId",
		name: "files.name",
		mimeType: "files.mimeType",
		size: "files.size",
		hash: "files.hash",
		remoteId: "files.remoteId",
		folderId: "files.folderId",
		uploadedBy: "files.uploadedBy",
		updatedAt: "files.updatedAt",
	},
	folders: {
		id: "folders.id",
		nodeType: "folders.nodeType",
		virtualPath: "folders.virtualPath",
		providerId: "folders.providerId",
		isDeleted: "folders.isDeleted",
		workspaceId: "folders.workspaceId",
		name: "folders.name",
		remoteId: "folders.remoteId",
		parentId: "folders.parentId",
		createdBy: "folders.createdBy",
	},
	jobs: {
		id: "jobs.id",
		status: "jobs.status",
	},
}));

mock.module("drizzle-orm", () => ({
	eq: (...args: unknown[]) => ({ type: "eq", args }),
	and: (...args: unknown[]) => ({ type: "and", args }),
	like: (...args: unknown[]) => ({ type: "like", args }),
	inArray: (...args: unknown[]) => ({ type: "inArray", args }),
	or: (...args: unknown[]) => ({ type: "or", args }),
}));

mock.module("@/config/env", () => ({
	env: {
		DATA_DIR: "/tmp/drivebase-test-data",
		TRANSFER_CACHE_DIR: TRANSFER_CACHE,
	},
}));

mock.module("@/redis/client", () => ({
	createBullMQConnection: () => ({}),
}));

mock.module("@/queue/transfer/enqueue", () => ({
	enqueueProviderTransfer: mock(async () => ({})),
}));

mock.module("@/service/folder/mutation", () => ({
	moveFolder: mock(async () => undefined),
}));

mock.module("@/service/file/query/file-read", () => ({
	getFile: getFileMock,
}));

mock.module("@/service/file/transfer/transfer-session", () => ({
	getTransferSessionById,
	updateTransferSession,
}));

mock.module("@/utils/jobs/job-cancel", () => ({
	assertNotCancelled: mock(async () => undefined),
	clearJobCancellation: mock(async () => undefined),
	JobCancelledError: class extends Error {},
}));

mock.module("@/utils/jobs/job-pause", () => ({
	waitForJobResolution,
}));

mock.module("@/utils/runtime/logger", () => ({
	logger: {
		debug: () => undefined,
		info: () => undefined,
		warn: () => undefined,
		error: () => undefined,
	},
}));

import type { JobContext } from "../../queue/transfer/worker";
import { handleRootTransfer } from "../../queue/transfer/worker";

function createProvider(overrides: Record<string, unknown> = {}) {
	return {
		createFolder: mock(async () => "remote-folder-1"),
		downloadFile: mock(async () => {
			const chunks = [new Uint8Array([1, 2, 3])];
			let index = 0;
			return new ReadableStream({
				pull(controller) {
					if (index < chunks.length) {
						controller.enqueue(chunks[index++] as Uint8Array);
					} else {
						controller.close();
					}
				},
			});
		}),
		requestUpload: mock(async () => ({ fileId: "upload-file-1" })),
		uploadFile: mock(async () => "remote-file-1"),
		delete: mock(async () => undefined),
		cleanup: mock(async () => undefined),
		supportsChunkedUpload: false,
		...overrides,
	};
}

function createContext(
	input: Partial<JobContext> & {
		sourceProvider?: ReturnType<typeof createProvider>;
		targetProvider?: ReturnType<typeof createProvider>;
	},
): JobContext {
	const sourceProvider = input.sourceProvider ?? createProvider();
	const targetProvider = input.targetProvider ?? createProvider();

	return {
		activityService: {
			update: mock(async () => undefined),
			complete: mock(async () => undefined),
			fail: mock(async () => undefined),
			log: mock(async () => undefined),
		} as never,
		providerService: {
			getProvider: mock(async (providerId: string) => ({ id: providerId })),
			getProviderInstance: mock(async (provider: { id: string }) =>
				provider.id === "target-provider" ? targetProvider : sourceProvider,
			),
		} as never,
		jobId: "job-1",
		workspaceId: "ws-1",
		userId: "user-1",
		assertNotCancelled: mock(async () => undefined),
		updateActivity: mock(async () => undefined),
		...input,
	};
}

describe("handleRootTransfer", () => {
	beforeEach(async () => {
		activeDb = undefined as never;
		getFileMock.mockReset();
		getFileMock.mockImplementation((async (_db: unknown, fileId: string) => ({
			id: fileId,
			name: fileId === "file-1" ? ".env" : "report.txt",
			virtualPath: fileId === "file-1" ? "/Folder/.env" : "/report.txt",
			mimeType: "text/plain",
			size: 3,
			hash: "hash-1",
			remoteId: `source-${fileId}-remote`,
			providerId: "source-provider",
			workspaceId: "ws-1",
			folderId: fileId === "file-1" ? "folder-1" : null,
			nodeType: "file" as const,
			isDeleted: false,
		})) as any);
		getTransferSessionById.mockReset();
		updateTransferSession.mockReset();
		waitForJobResolution.mockReset();
		await rm(TRANSFER_CACHE, { recursive: true, force: true }).catch(() => {});
	});

	afterAll(async () => {
		await rm(TRANSFER_CACHE, { recursive: true, force: true }).catch(() => {});
	});

	it("duplicates a conflicting root folder and counts dotfiles in the parent job", async () => {
		activeDb = buildMockDb({
			limitResults: [
				[
					{
						id: "existing-root",
						virtualPath: "/Folder",
						providerId: "target-provider",
						remoteId: "existing-root-remote",
					},
				],
				[],
				[],
				[
					{
						id: "file-1",
						name: ".env",
						virtualPath: "/Folder/.env",
						mimeType: "text/plain",
						size: 3,
						hash: "hash-1",
						remoteId: "source-file-remote",
						providerId: "source-provider",
						workspaceId: "ws-1",
						folderId: "folder-1",
						nodeType: "file",
						isDeleted: false,
					},
				],
				[],
			],
			returningResults: [
				[
					{
						id: "dest-folder-1",
						virtualPath: "/Folder (1)",
						name: "Folder (1)",
						remoteId: "dest-folder-remote",
						providerId: "target-provider",
						parentId: null,
					},
				],
				[
					{
						id: "copied-file-1",
						virtualPath: "/Folder (1)/.env",
						name: ".env",
						remoteId: "remote-file-1",
						providerId: "target-provider",
					},
				],
			],
		});
		getTransferSessionById.mockResolvedValue({
			id: "session-1",
			jobId: "job-1",
			status: "pending",
			targetFolderId: null,
			targetProviderId: "target-provider",
			sourceItemsData: [],
			manifestData: {
				targetFolderId: null,
				targetProviderId: "target-provider",
				roots: [
					{
						id: "root:folder-1",
						kind: "folder",
						sourceFolderId: "folder-1",
						sourceProviderId: "source-provider",
						sourceVirtualPath: "/Folder",
						sourceRemoteId: "source-folder-remote",
						originalName: "Folder",
						resolvedName: "Folder",
						status: "pending",
					},
				],
				folders: [
					{
						id: "folder:folder-1",
						sourceFolderId: "folder-1",
						sourceProviderId: "source-provider",
						sourceVirtualPath: "/Folder",
						sourceRootId: "root:folder-1",
						name: "Folder",
						relativePath: "",
						status: "pending",
					},
				],
				files: [
					{
						id: "file:file-1",
						sourceFileId: "file-1",
						sourceProviderId: "source-provider",
						sourceVirtualPath: "/Folder/.env",
						sourceRootId: "root:folder-1",
						name: ".env",
						relativeDirPath: "",
						status: "pending",
						isHidden: true,
					},
				],
				preflightComplete: false,
				completedFiles: 0,
				failedFiles: 0,
				skippedFiles: 0,
				totalFiles: 1,
				hiddenFiles: 1,
				currentConflict: null,
			},
		});
		waitForJobResolution.mockResolvedValue({ action: "duplicate" });

		const sourceProvider = createProvider();
		const targetProvider = createProvider();
		const ctx = createContext({ sourceProvider, targetProvider });

		await handleRootTransfer(ctx, {
			entity: "transfer",
			jobId: "job-1",
			workspaceId: "ws-1",
			userId: "user-1",
			transferSessionId: "session-1",
			operation: "copy",
		});

		expect(waitForJobResolution).toHaveBeenCalledWith("job-1");
		expect(ctx.activityService.update).toHaveBeenCalledWith(
			"job-1",
			expect.objectContaining({
				status: "paused",
				metadata: expect.objectContaining({
					conflictKind: "folder-root",
					allowedResolutions: ["duplicate", "skip"],
					allowApplyToAll: false,
				}),
			}),
		);
		expect(updateTransferSession).toHaveBeenCalledWith(
			expect.anything(),
			"session-1",
			expect.objectContaining({
				manifest: expect.objectContaining({
					roots: [
						expect.objectContaining({
							resolvedName: "Folder (1)",
						}),
					],
				}),
			}),
		);
		expect(targetProvider.createFolder).toHaveBeenCalledWith({
			name: "Folder (1)",
		});
		expect(ctx.activityService.update).toHaveBeenCalledWith(
			"job-1",
			expect.objectContaining({
				message: "Downloading 1 of 1 files — .env",
			}),
		);
		expect(ctx.activityService.complete).toHaveBeenCalledWith(
			"job-1",
			"1 transferred, 1 hidden",
		);
		expect(ctx.activityService.fail).not.toHaveBeenCalled();
	});

	it("pauses on file conflicts with file-level actions and apply-to-all", async () => {
		activeDb = buildMockDb({
			limitResults: [
				[
					{
						id: "file-1",
						name: "report.txt",
						virtualPath: "/report.txt",
						mimeType: "text/plain",
						size: 3,
						hash: "hash-1",
						remoteId: "source-file-remote",
						providerId: "source-provider",
						workspaceId: "ws-1",
						folderId: null,
						nodeType: "file",
						isDeleted: false,
					},
				],
				[
					{
						id: "existing-file",
						virtualPath: "/report.txt",
						remoteId: "existing-target-remote",
						providerId: "target-provider",
					},
				],
			],
		});
		getTransferSessionById.mockResolvedValue({
			id: "session-2",
			jobId: "job-1",
			status: "pending",
			targetFolderId: null,
			targetProviderId: "target-provider",
			sourceItemsData: [],
			manifestData: {
				targetFolderId: null,
				targetProviderId: "target-provider",
				roots: [],
				folders: [],
				files: [
					{
						id: "file:file-1",
						sourceFileId: "file-1",
						sourceProviderId: "source-provider",
						sourceVirtualPath: "/report.txt",
						sourceRootId: null,
						name: "report.txt",
						relativeDirPath: "",
						status: "pending",
						isHidden: false,
					},
				],
				preflightComplete: true,
				completedFiles: 0,
				failedFiles: 0,
				skippedFiles: 0,
				totalFiles: 1,
				hiddenFiles: 0,
				currentConflict: null,
			},
		});
		waitForJobResolution.mockResolvedValue({
			action: "skip",
			applyToAll: true,
		});

		const ctx = createContext({
			sourceProvider: createProvider(),
			targetProvider: createProvider(),
		});

		await handleRootTransfer(ctx, {
			entity: "transfer",
			jobId: "job-1",
			workspaceId: "ws-1",
			userId: "user-1",
			transferSessionId: "session-2",
			operation: "copy",
		});

		expect(ctx.activityService.update).toHaveBeenCalledWith(
			"job-1",
			expect.objectContaining({
				status: "paused",
				metadata: expect.objectContaining({
					conflictKind: "file",
					allowedResolutions: ["duplicate", "overwrite", "skip"],
					allowApplyToAll: true,
				}),
			}),
		);
		expect(ctx.activityService.complete).toHaveBeenCalledWith(
			"job-1",
			"0 transferred, 1 skipped",
		);
		expect(ctx.activityService.fail).not.toHaveBeenCalled();
	});
});
