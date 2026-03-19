import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ProviderError } from "@drivebase/core";

// ── Constants ──────────────────────────────────────────────────────────

const TRANSFER_CACHE = join(
	process.env.TMPDIR ?? "/tmp",
	"drivebase-test-transfers",
);

const FILE_ROW = {
	id: "file-1",
	name: "test.txt",
	virtualPath: "/test.txt",
	mimeType: "text/plain",
	size: 3,
	hash: "abc",
	remoteId: "source-remote-1",
	providerId: "source-provider",
	workspaceId: "ws-1",
	folderId: null,
	nodeType: "file" as const,
	isDeleted: false,
	uploadedBy: "user-1",
};

// ── DB mock builder (fresh per test) ───────────────────────────────────

let activeDb: ReturnType<typeof buildMockDb>;
const getFileMock = mock(async () => FILE_ROW);

function buildMockDb() {
	const calls: { op: string }[] = [];

	const builder: any = {};

	builder.select = (..._args: unknown[]) => {
		calls.push({ op: "select" });
		return builder;
	};
	builder.from = () => builder;
	builder.where = () => builder;
	builder.orderBy = () => builder;
	builder.limit = async () => [];
	builder.update = () => {
		calls.push({ op: "update" });
		return builder;
	};
	builder.set = (..._args: unknown[]) => {
		calls.push({ op: "set" });
		return builder;
	};
	builder.returning = async () => {
		const hasInsert = calls.some((c) => c.op === "insert");
		if (hasInsert) {
			return [
				{
					...FILE_ROW,
					id: "file-copy",
					providerId: "target-provider",
					remoteId: "final-remote-id",
				},
			];
		}
		return [
			{
				...FILE_ROW,
				providerId: "target-provider",
				remoteId: "final-remote-id",
			},
		];
	};
	builder.insert = () => {
		calls.push({ op: "insert" });
		return builder;
	};
	builder.values = () => builder;

	return { db: builder, calls };
}

// ── Module mocks ───────────────────────────────────────────────────────

mock.module("@drivebase/db", () => ({
	getDb: () => {
		if (!activeDb) activeDb = buildMockDb();
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
	jobs: { id: "jobs.id", status: "jobs.status" },
}));

mock.module("drizzle-orm", () => ({
	eq: (...args: unknown[]) => ({ type: "eq", args }),
	and: (...args: unknown[]) => ({ type: "and", args }),
	like: (...args: unknown[]) => ({ type: "like", args }),
	inArray: (...args: unknown[]) => ({ type: "inArray", args }),
}));

mock.module("@/config/env", () => ({
	env: { DATA_DIR: "/tmp/test-data", TRANSFER_CACHE_DIR: TRANSFER_CACHE },
}));

mock.module("@/redis/client", () => ({
	createBullMQConnection: () => ({}),
}));

mock.module("@/queue/transfer/enqueue", () => ({
	enqueueProviderTransfer: mock(async () => ({
		activityJob: { id: "child-job-1" },
		queueJobId: "queue-child-1",
	})),
}));

mock.module("@/service/activity", () => ({
	ActivityService: class {
		create = mock(async () => ({}));
		update = mock(async () => {});
		complete = mock(async () => {});
		fail = mock(async () => {});
		log = mock(async () => {});
	},
}));

mock.module("@/service/folder/mutation", () => ({
	moveFolder: mock(async () => {}),
}));

mock.module("@/service/file/query/file-read", () => ({
	getFile: getFileMock,
}));

mock.module("@/utils/jobs/job-cancel", () => ({
	assertNotCancelled: mock(async () => {}),
	clearJobCancellation: mock(async () => {}),
	JobCancelledError: class extends Error {},
}));

mock.module("@/utils/jobs/job-pause", () => ({
	waitForJobResolution: mock(async () => {
		throw new Error("waitForJobResolution should not be called in this test");
	}),
}));

const warnMock = mock(() => {});
mock.module("@/utils/runtime/logger", () => ({
	logger: {
		debug: () => {},
		info: () => {},
		warn: warnMock,
		error: () => {},
	},
}));

import type { JobContext } from "../../queue/transfer/worker";
import {
	handleBatchTransfer,
	handleFileTransfer,
} from "../../queue/transfer/worker";
import type {
	ProviderBatchTransferJobData,
	ProviderFileTransferJobData,
} from "../../queue/transfer/queue";

// ── Helpers ────────────────────────────────────────────────────────────

function createMockProvider(overrides: Record<string, unknown> = {}) {
	return {
		downloadFile: mock(async () => {
			const chunks = [new Uint8Array([1, 2, 3])];
			let i = 0;
			return new ReadableStream({
				pull(controller) {
					if (i < chunks.length) {
						controller.enqueue(chunks[i++]);
					} else {
						controller.close();
					}
				},
			});
		}),
		requestUpload: mock(async () => ({ fileId: "new-remote-id" })),
		uploadFile: mock(async () => "final-remote-id"),
		delete: mock(async () => {}),
		cleanup: mock(async () => {}),
		supportsChunkedUpload: false,
		...overrides,
	};
}

function createMockCtx(overrides: Partial<JobContext> = {}): JobContext {
	return {
		activityService: {
			update: mock(async () => {}),
			complete: mock(async () => {}),
			fail: mock(async () => {}),
			log: mock(async () => {}),
		} as any,
		providerService: {
			getProvider: mock(async () => ({ id: "provider-record" })),
			getProviderInstance: mock(),
		} as any,
		jobId: "test-job-1",
		workspaceId: "ws-1",
		userId: "user-1",
		assertNotCancelled: mock(async () => {}),
		updateActivity: mock(async () => {}),
		...overrides,
	};
}

function makeData(
	overrides: Partial<ProviderFileTransferJobData> = {},
): ProviderFileTransferJobData {
	return {
		entity: "file",
		jobId: "test-job-1",
		workspaceId: "ws-1",
		userId: "user-1",
		fileId: "file-1",
		targetProviderId: "target-provider",
		targetFolderId: null,
		operation: "cut",
		...overrides,
	};
}

async function ensureCacheFile(jobId = "test-job-1") {
	const dir = join(TRANSFER_CACHE, "ws-1", "file-1", jobId);
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, "payload.bin"), Buffer.from([1, 2, 3]));
}

// ── Setup / teardown ───────────────────────────────────────────────────

afterAll(async () => {
	await rm(TRANSFER_CACHE, { recursive: true, force: true }).catch(() => {});
});

beforeEach(() => {
	warnMock.mockReset();
	getFileMock.mockReset();
	getFileMock.mockResolvedValue(FILE_ROW);
});

// ── Tests ──────────────────────────────────────────────────────────────

describe("handleFileTransfer — cut operation ordering", () => {
	it("updates DB before deleting source so a delete failure does not cause data loss", async () => {
		activeDb = buildMockDb();
		await ensureCacheFile();
		const callOrder: string[] = [];

		const origSet = activeDb.db.set;
		activeDb.db.set = (...args: unknown[]) => {
			callOrder.push("db.update");
			return origSet(...args);
		};

		const sourceProvider = createMockProvider({
			delete: mock(async () => {
				callOrder.push("provider.delete");
			}),
		});
		const targetProvider = createMockProvider();

		const ctx = createMockCtx();
		(ctx.providerService.getProviderInstance as any)
			.mockResolvedValueOnce(sourceProvider)
			.mockResolvedValueOnce(targetProvider);

		await handleFileTransfer(ctx, makeData());

		const dbIdx = callOrder.indexOf("db.update");
		const deleteIdx = callOrder.indexOf("provider.delete");
		expect(dbIdx).toBeGreaterThanOrEqual(0);
		expect(deleteIdx).toBeGreaterThanOrEqual(0);
		expect(dbIdx).toBeLessThan(deleteIdx);
	});

	it("completes successfully even when source deletion fails", async () => {
		activeDb = buildMockDb();
		await ensureCacheFile();
		warnMock.mockReset();

		const sourceProvider = createMockProvider({
			delete: mock(async () => {
				throw new ProviderError("samba", "Failed to delete", {
					op: "delete",
					remoteId: "source-remote-1",
				});
			}),
		});
		const targetProvider = createMockProvider();

		const ctx = createMockCtx();
		(ctx.providerService.getProviderInstance as any)
			.mockResolvedValueOnce(sourceProvider)
			.mockResolvedValueOnce(targetProvider);

		// Should NOT throw despite delete failure
		await handleFileTransfer(ctx, makeData());

		// The job should still be marked as completed
		expect(ctx.activityService.complete).toHaveBeenCalledWith(
			"test-job-1",
			"Transfer completed",
		);

		// A warning should have been logged about the failed deletion
		expect(warnMock).toHaveBeenCalled();
	});

	it("does not call provider.delete for copy operations", async () => {
		activeDb = buildMockDb();
		await ensureCacheFile();

		const sourceProvider = createMockProvider();
		const targetProvider = createMockProvider();

		const ctx = createMockCtx();
		(ctx.providerService.getProviderInstance as any)
			.mockResolvedValueOnce(sourceProvider)
			.mockResolvedValueOnce(targetProvider);

		await handleFileTransfer(ctx, makeData({ operation: "copy" }));

		expect(sourceProvider.delete).not.toHaveBeenCalled();
		expect(ctx.activityService.complete).toHaveBeenCalled();
	});
});

function buildBatchDb(sequences: Array<unknown[]>) {
	const queue = [...sequences];
	const chain: any = {
		from: () => chain,
		where: async () => {
			if (queue.length === 0) {
				throw new Error("No queued DB response available");
			}
			return queue.shift();
		},
	};

	return {
		db: {
			select: () => chain,
		},
	};
}

function createBatchCtx(overrides: Partial<JobContext> = {}): JobContext {
	return {
		activityService: {
			update: mock(async () => {}),
			complete: mock(async () => {}),
			fail: mock(async () => {}),
			log: mock(async () => {}),
		} as any,
		providerService: {
			getProvider: mock(async () => ({ id: "provider-record" })),
			getProviderInstance: mock(),
		} as any,
		jobId: "batch-job-1",
		workspaceId: "ws-1",
		userId: "user-1",
		assertNotCancelled: mock(async () => {}),
		updateActivity: mock(async () => {}),
		...overrides,
	};
}

function makeBatchData(
	overrides: Partial<ProviderBatchTransferJobData> = {},
): ProviderBatchTransferJobData {
	return {
		entity: "batch",
		jobId: "monitor-job-1",
		workspaceId: "ws-1",
		userId: "user-1",
		childJobIds: ["child-1", "child-2"],
		operation: "copy",
		parentJobId: "visible-job-1",
		...overrides,
	};
}

describe("handleBatchTransfer", () => {
	it("reports the actual completed count while another file is still running", async () => {
		activeDb = buildBatchDb([
			[
				{
					id: "child-1",
					status: "completed",
					title: "Copy a.txt",
					message: "",
					progress: 1,
				},
				{
					id: "child-2",
					status: "running",
					title: "Copy b.txt",
					message: "",
					progress: 0,
				},
			],
			[
				{
					id: "child-1",
					status: "completed",
					title: "Copy a.txt",
					message: "",
					progress: 1,
				},
				{
					id: "child-2",
					status: "completed",
					title: "Copy b.txt",
					message: "",
					progress: 1,
				},
			],
			[{ status: "completed" }, { status: "completed" }],
		]) as any;

		const ctx = createBatchCtx();

		await handleBatchTransfer(ctx, makeBatchData());

		expect(ctx.activityService.update).toHaveBeenCalledWith(
			"visible-job-1",
			expect.objectContaining({
				message: "Copying 1 of 2 files — b.txt",
			}),
		);
		expect(ctx.activityService.complete).toHaveBeenCalledWith(
			"visible-job-1",
			"2 files transferred",
		);
	});

	it("does not stall when finished count advances without progress changing", async () => {
		const originalDateNow = Date.now;
		const dateValues = [0, 0, 1000, 301000, 302000];
		Date.now = mock(() => dateValues.shift() ?? 302000) as typeof Date.now;

		try {
			activeDb = buildBatchDb([
				[
					{
						id: "child-1",
						status: "running",
						title: "Copy a.txt",
						message: "",
						progress: 0,
					},
					{
						id: "child-2",
						status: "pending",
						title: "Copy b.txt",
						message: "",
						progress: 0,
					},
				],
				[
					{
						id: "child-1",
						status: "completed",
						title: "Copy a.txt",
						message: "",
						progress: 0,
					},
					{
						id: "child-2",
						status: "running",
						title: "Copy b.txt",
						message: "",
						progress: 0,
					},
				],
				[
					{
						id: "child-1",
						status: "completed",
						title: "Copy a.txt",
						message: "",
						progress: 0,
					},
					{
						id: "child-2",
						status: "completed",
						title: "Copy b.txt",
						message: "",
						progress: 0,
					},
				],
				[{ status: "completed" }, { status: "completed" }],
			]) as any;

			const ctx = createBatchCtx();

			await handleBatchTransfer(ctx, makeBatchData());

			expect(ctx.activityService.fail).not.toHaveBeenCalled();
			expect(ctx.activityService.complete).toHaveBeenCalledWith(
				"visible-job-1",
				"2 files transferred",
			);
		} finally {
			Date.now = originalDateNow;
		}
	});
});
