import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ValidationError } from "@drivebase/core";

const getFile = mock();
const getFolder = mock();
const moveFile = mock();
const moveFolder = mock();
const enqueueProviderTransfer = mock();
const providerGetProvider = mock();
const providerGetProviderInstance = mock();
const providerCreateFolder = mock();
const activityCreate = mock();
const activityUpdate = mock();

class ActivityServiceMock {
	constructor(_db: unknown) {}
	create(...args: Parameters<typeof activityCreate>) {
		return activityCreate(...args);
	}
	update(...args: Parameters<typeof activityUpdate>) {
		return activityUpdate(...args);
	}
}

mock.module("../../../service/file/query/file-read", () => ({
	getFile,
}));

mock.module("@/service/folder/query", () => ({
	getFolder,
}));

mock.module("../../../service/file/mutation/move-file", () => ({
	moveFile,
}));

mock.module("@/service/folder/mutation", () => ({
	moveFolder,
}));

mock.module("@/queue/transfer/enqueue", () => ({
	enqueueProviderTransfer,
}));

mock.module("@/service/activity", () => ({
	ActivityService: ActivityServiceMock,
}));

mock.module("@/service/provider", () => ({
	ProviderService: class {
		getProvider = providerGetProvider;
		getProviderInstance = providerGetProviderInstance;
	},
}));

import { pasteSelection } from "../../../service/file/transfer/paste-selection";

function createConflictCheckDb() {
	return {
		select: () => ({
			from: () => ({
				where: () => ({
					limit: async () => [],
				}),
			}),
		}),
	};
}

function createFolderCopyDb(responses: unknown[]) {
	const queue = [...responses];

	const next = () => {
		if (queue.length === 0) {
			throw new Error("No queued DB response available");
		}
		return queue.shift();
	};

	const chain: any = {
		from: () => chain,
		where: () => chain,
		orderBy: async () => next(),
		limit: async () => next(),
	};

	return {
		select: () => chain,
		insert: () => ({
			values: () => ({
				returning: async () => next(),
			}),
		}),
	};
}

describe("pasteSelection", () => {
	beforeEach(() => {
		getFile.mockReset();
		getFolder.mockReset();
		moveFile.mockReset();
		moveFolder.mockReset();
		enqueueProviderTransfer.mockReset();
		providerGetProvider.mockReset();
		providerGetProviderInstance.mockReset();
		providerCreateFolder.mockReset();
		activityCreate.mockReset();
		activityUpdate.mockReset();
		providerGetProvider.mockResolvedValue({ id: "provider-record" });
		providerGetProviderInstance.mockResolvedValue({
			createFolder: providerCreateFolder,
			cleanup: mock(async () => {}),
		});
		providerCreateFolder.mockResolvedValue("remote-folder-1");
		activityCreate.mockResolvedValue({
			id: "batch-job-1",
			type: "provider_transfer",
			title: "Copying 4 files",
			progress: 0,
			status: "pending",
			metadata: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
		activityUpdate.mockResolvedValue(undefined);
	});

	it("queues same-provider file cut as a transfer job (shows progress)", async () => {
		const db = createConflictCheckDb() as any;
		getFile.mockResolvedValue({
			id: "file-1",
			name: "a.txt",
			virtualPath: "/a.txt",
			providerId: "provider-1",
			folderId: null,
			size: 100,
		});
		getFolder.mockResolvedValue({
			id: "folder-target",
			name: "Target",
			virtualPath: "/Target",
			providerId: "provider-1",
		});
		enqueueProviderTransfer.mockResolvedValue({
			activityJob: {
				id: "job-1",
				type: "provider_transfer",
				title: "Move a.txt",
				progress: 0,
				status: "pending",
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});

		const result = await pasteSelection(
			db,
			"user-1",
			"ws-1",
			"cut",
			"folder-target",
			null,
			[{ kind: "file", id: "file-1" }],
		);

		expect(moveFile).not.toHaveBeenCalled();
		expect(enqueueProviderTransfer).toHaveBeenCalledTimes(1);
		expect(enqueueProviderTransfer.mock.calls[0]?.[1]).toMatchObject({
			entity: "file",
			operation: "cut",
			targetProviderId: "provider-1",
			targetFolderId: "folder-target",
		});
		expect(result.requiresRefresh).toBe(false);
		expect(result.jobs.map((job) => job.id)).toEqual(["job-1"]);
	});

	it("queues cross-provider file copy jobs", async () => {
		const db = createConflictCheckDb() as any;
		getFile.mockResolvedValue({
			id: "file-1",
			name: "a.txt",
			virtualPath: "/a.txt",
			providerId: "provider-1",
			folderId: null,
			size: 123,
		});
		getFolder.mockResolvedValue({
			id: "folder-target",
			name: "Target",
			virtualPath: "/Target",
			providerId: "provider-2",
		});
		enqueueProviderTransfer.mockResolvedValue({
			activityJob: {
				id: "job-1",
				type: "provider_transfer",
				title: "Copy a.txt",
				progress: 0,
				status: "pending",
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});

		const result = await pasteSelection(
			db,
			"user-1",
			"ws-1",
			"copy",
			"folder-target",
			null,
			[{ kind: "file", id: "file-1" }],
		);

		expect(enqueueProviderTransfer).toHaveBeenCalledTimes(1);
		expect(enqueueProviderTransfer.mock.calls[0]?.[1]).toMatchObject({
			entity: "file",
			operation: "copy",
			targetProviderId: "provider-2",
			targetFolderId: "folder-target",
		});
		expect(result.requiresRefresh).toBe(false);
		expect(result.jobs.map((job) => job.id)).toEqual(["job-1"]);
	});

	it("rejects pasting a folder into its own descendant", async () => {
		const db = createConflictCheckDb() as any;
		getFolder.mockImplementation(async (_db, folderId: string) => {
			if (folderId === "source-folder") {
				return {
					id: "source-folder",
					name: "Source",
					virtualPath: "/Source",
					providerId: "provider-1",
					parentId: null,
				};
			}
			return {
				id: "target-folder",
				name: "Descendant",
				virtualPath: "/Source/Descendant",
				providerId: "provider-1",
				parentId: "source-folder",
			};
		});

		await expect(
			pasteSelection(db, "user-1", "ws-1", "copy", "target-folder", null, [
				{ kind: "folder", id: "source-folder" },
			]),
		).rejects.toBeInstanceOf(ValidationError);
		expect(enqueueProviderTransfer).not.toHaveBeenCalled();
	});

	it("queues a file transfer when copying a folder with nested files", async () => {
		const db = createFolderCopyDb([
			[],
			[],
			[
				{
					id: "dest-folder-1",
					virtualPath: "/Source",
					name: "Source",
					remoteId: "remote-folder-1",
					providerId: "provider-1",
				},
			],
			[],
			[
				{
					id: "file-1",
					name: "a.txt",
					virtualPath: "/Source/a.txt",
					providerId: "provider-1",
					folderId: "source-folder",
				},
			],
		]) as any;
		getFolder.mockResolvedValue({
			id: "source-folder",
			name: "Source",
			virtualPath: "/Source",
			providerId: "provider-1",
			parentId: null,
		});
		enqueueProviderTransfer.mockResolvedValue({
			activityJob: {
				id: "job-1",
				type: "provider_transfer",
				title: "Copy a.txt",
				progress: 0,
				status: "pending",
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		});

		const result = await pasteSelection(
			db,
			"user-1",
			"ws-1",
			"copy",
			null,
			null,
			[{ kind: "folder", id: "source-folder" }],
		);

		expect(providerCreateFolder).toHaveBeenCalledWith({ name: "Source" });
		expect(enqueueProviderTransfer).toHaveBeenCalledTimes(1);
		expect(enqueueProviderTransfer.mock.calls[0]?.[1]).toMatchObject({
			entity: "file",
			operation: "copy",
			fileId: "file-1",
			targetProviderId: "provider-1",
			targetFolderId: "dest-folder-1",
		});
		expect(result.jobs.map((job) => job.id)).toEqual(["job-1"]);
	});

	it("marks empty folder copies as requiring refresh", async () => {
		const db = createFolderCopyDb([
			[],
			[],
			[
				{
					id: "dest-folder-1",
					virtualPath: "/Empty",
					name: "Empty",
					remoteId: "remote-folder-1",
					providerId: "provider-1",
				},
			],
			[],
			[],
		]) as any;
		getFolder.mockResolvedValue({
			id: "empty-folder",
			name: "Empty",
			virtualPath: "/Empty",
			providerId: "provider-1",
			parentId: null,
		});

		const result = await pasteSelection(
			db,
			"user-1",
			"ws-1",
			"copy",
			null,
			null,
			[{ kind: "folder", id: "empty-folder" }],
		);

		expect(enqueueProviderTransfer).not.toHaveBeenCalled();
		expect(result).toEqual({ jobs: [], requiresRefresh: true });
	});

	it("creates a visible batch job and enqueues child transfers for multi-file folder copies", async () => {
		const db = createFolderCopyDb([
			[
				{
					id: "target-folder",
					virtualPath: "/Target",
					name: "Target",
					remoteId: "remote-target-folder",
					providerId: "provider-2",
				},
			],
			[],
			[],
			[
				{
					remoteId: "remote-target-folder",
				},
			],
			[
				{
					id: "dest-folder-1",
					virtualPath: "/Target/Source",
					name: "Source",
					remoteId: "remote-folder-1",
					providerId: "provider-2",
				},
			],
			[],
			[
				{
					id: "file-1",
					name: "a.txt",
					virtualPath: "/Source/a.txt",
					providerId: "provider-1",
					folderId: "source-folder",
				},
				{
					id: "file-2",
					name: "b.txt",
					virtualPath: "/Source/b.txt",
					providerId: "provider-1",
					folderId: "source-folder",
				},
				{
					id: "file-3",
					name: "c.txt",
					virtualPath: "/Source/c.txt",
					providerId: "provider-1",
					folderId: "source-folder",
				},
				{
					id: "file-4",
					name: "d.txt",
					virtualPath: "/Source/d.txt",
					providerId: "provider-1",
					folderId: "source-folder",
				},
			],
		]) as any;

		getFolder.mockImplementation(async (_db, folderId: string) => {
			if (folderId === "source-folder") {
				return {
					id: "source-folder",
					name: "Source",
					virtualPath: "/Source",
					providerId: "provider-1",
					parentId: null,
				};
			}
			return {
				id: "target-folder",
				name: "Target",
				virtualPath: "/Target",
				providerId: "provider-2",
				parentId: null,
				remoteId: "remote-target-folder",
			};
		});

		enqueueProviderTransfer.mockImplementation(
			async (_activityService, input) => ({
				activityJob: {
					id:
						input.entity === "batch"
							? "batch-monitor-job-1"
							: `child-job-${String(input.fileId)}`,
					type: "provider_transfer",
					title: input.title,
					progress: 0,
					status: "pending",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			}),
		);

		const result = await pasteSelection(
			db,
			"user-1",
			"ws-1",
			"copy",
			"target-folder",
			null,
			[{ kind: "folder", id: "source-folder" }],
		);

		expect(providerCreateFolder).toHaveBeenCalledWith({
			name: "Source",
			parentId: "remote-target-folder",
		});
		expect(activityCreate).toHaveBeenCalledWith("ws-1", {
			type: "provider_transfer",
			title: "Copying 4 files",
			message: "Copying 0 of 4 files (queued)",
			metadata: {
				entity: "batch",
				operation: "copy",
				totalFiles: 4,
				phase: "queued",
			},
		});
		expect(enqueueProviderTransfer).toHaveBeenCalledTimes(5);
		expect(
			enqueueProviderTransfer.mock.calls
				.slice(0, 4)
				.every((call) => call[1]?.entity === "file"),
		).toBe(true);
		expect(enqueueProviderTransfer.mock.calls[4]?.[1]).toMatchObject({
			entity: "batch",
			parentJobId: "batch-job-1",
			childJobIds: [
				"child-job-file-1",
				"child-job-file-2",
				"child-job-file-3",
				"child-job-file-4",
			],
		});
		expect(result.jobs.map((job) => job.id)).toEqual(["batch-job-1"]);
		expect(result.requiresRefresh).toBe(false);
	});
});
