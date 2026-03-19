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

class ActivityServiceMock {
	constructor(_db: unknown) {}
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
		providerGetProvider.mockResolvedValue({ id: "provider-record" });
		providerGetProviderInstance.mockResolvedValue({
			createFolder: providerCreateFolder,
			cleanup: mock(async () => {}),
		});
		providerCreateFolder.mockResolvedValue("remote-folder-1");
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
});
