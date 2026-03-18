import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ValidationError } from "@drivebase/core";

const getFile = mock();
const getFolder = mock();
const moveFile = mock();
const moveFolder = mock();
const enqueueProviderTransfer = mock();

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

describe("pasteSelection", () => {
	beforeEach(() => {
		getFile.mockReset();
		getFolder.mockReset();
		moveFile.mockReset();
		moveFolder.mockReset();
		enqueueProviderTransfer.mockReset();
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
			pasteSelection(db, "user-1", "ws-1", "copy", "target-folder", [
				{ kind: "folder", id: "source-folder" },
			]),
		).rejects.toBeInstanceOf(ValidationError);
		expect(enqueueProviderTransfer).not.toHaveBeenCalled();
	});
});
