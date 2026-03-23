import { beforeEach, describe, expect, it, mock } from "bun:test";
import { ValidationError } from "@drivebase/core";

const getFile = mock();
const getFolder = mock();
const activityCreate = mock();
const activityUpdate = mock();
const createTransferSession = mock();
const queueAdd = mock();

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

mock.module("@/service/activity", () => ({
	ActivityService: ActivityServiceMock,
}));

mock.module("@/queue/transfer/queue", () => ({
	buildTransferQueueJobId: ({
		entity,
		jobId,
	}: {
		entity: string;
		jobId: string;
	}) => `provider-transfer:${entity}:${jobId}`,
	getTransferQueue: () => ({
		add: queueAdd,
	}),
}));

mock.module("../../../service/file/transfer/transfer-session", () => ({
	createTransferSession,
}));

import { pasteSelection } from "../../../service/file/transfer/paste-selection";

function createActivityJob(
	id: string,
	title: string,
): {
	id: string;
	type: "provider_transfer";
	title: string;
	message: string;
	progress: number;
	status: "pending";
	metadata: Record<string, unknown> | null;
	createdAt: Date;
	updatedAt: Date;
} {
	return {
		id,
		type: "provider_transfer",
		title,
		message: "Queued for transfer",
		progress: 0,
		status: "pending",
		metadata: null,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

describe("pasteSelection", () => {
	beforeEach(() => {
		getFile.mockReset();
		getFolder.mockReset();
		activityCreate.mockReset();
		activityUpdate.mockReset();
		createTransferSession.mockReset();
		queueAdd.mockReset();

		activityCreate.mockResolvedValue(createActivityJob("job-1", "Copy a.txt"));
		activityUpdate.mockImplementation(async (_jobId, input) => ({
			...createActivityJob("job-1", "Copy a.txt"),
			metadata: input.metadata ?? null,
		}));
		createTransferSession.mockResolvedValue({ id: "session-1" });
		queueAdd.mockResolvedValue(undefined);
	});

	it("queues a single parent transfer job for file copies", async () => {
		getFile.mockResolvedValue({
			id: "file-1",
			name: "a.txt",
			virtualPath: "/a.txt",
			providerId: "provider-1",
			folderId: null,
		});
		getFolder.mockResolvedValue({
			id: "folder-target",
			name: "Target",
			virtualPath: "/Target",
			providerId: "provider-2",
		});

		const result = await pasteSelection(
			{} as never,
			"user-1",
			"ws-1",
			"copy",
			"folder-target",
			null,
			[{ kind: "file", id: "file-1" }],
		);

		expect(activityCreate).toHaveBeenCalledWith("ws-1", {
			type: "provider_transfer",
			title: "Copy a.txt",
			message: "Queued for transfer",
			metadata: {
				entity: "transfer",
				operation: "copy",
				phase: "queued",
			},
		});
		expect(createTransferSession).toHaveBeenCalledWith(
			{} as never,
			expect.objectContaining({
				workspaceId: "ws-1",
				userId: "user-1",
				jobId: "job-1",
				operation: "copy",
				targetFolderId: "folder-target",
				targetProviderId: "provider-2",
				sourceItems: [{ kind: "file", id: "file-1" }],
			}),
		);
		expect(queueAdd).toHaveBeenCalledWith(
			"provider-transfer",
			{
				entity: "transfer",
				jobId: "job-1",
				workspaceId: "ws-1",
				userId: "user-1",
				transferSessionId: "session-1",
				operation: "copy",
			},
			{ jobId: "provider-transfer:transfer:job-1" },
		);
		expect(result.requiresRefresh).toBe(false);
		expect(result.jobs).toHaveLength(1);
		expect(result.jobs[0]?.id).toBe("job-1");
		expect(result.jobs[0]?.metadata).toMatchObject({
			queueJobId: "provider-transfer:transfer:job-1",
			transferSessionId: "session-1",
			targetFolderId: "folder-target",
			targetProviderId: "provider-2",
		});
	});

	it("queues a parent transfer job for empty folder copies instead of short-circuiting", async () => {
		activityCreate.mockResolvedValue(
			createActivityJob("job-empty", "Copy Empty"),
		);
		activityUpdate.mockImplementation(async (_jobId, input) => ({
			...createActivityJob("job-empty", "Copy Empty"),
			metadata: input.metadata ?? null,
		}));
		createTransferSession.mockResolvedValue({ id: "session-empty" });
		getFolder.mockResolvedValue({
			id: "empty-folder",
			name: "Empty",
			virtualPath: "/Empty",
			providerId: "provider-1",
			parentId: null,
		});

		const result = await pasteSelection(
			{} as never,
			"user-1",
			"ws-1",
			"copy",
			null,
			null,
			[{ kind: "folder", id: "empty-folder" }],
		);

		expect(createTransferSession).toHaveBeenCalledWith(
			{} as never,
			expect.objectContaining({
				targetFolderId: null,
				targetProviderId: "provider-1",
				sourceItems: [{ kind: "folder", id: "empty-folder" }],
			}),
		);
		expect(queueAdd).toHaveBeenCalledTimes(1);
		expect(result).toMatchObject({
			requiresRefresh: false,
			jobs: [{ id: "job-empty" }],
		});
	});

	it("requires an explicit target provider at root when items come from multiple providers", async () => {
		getFile
			.mockResolvedValueOnce({
				id: "file-1",
				name: "a.txt",
				virtualPath: "/a.txt",
				providerId: "provider-1",
				folderId: null,
			})
			.mockResolvedValueOnce({
				id: "file-2",
				name: "b.txt",
				virtualPath: "/b.txt",
				providerId: "provider-2",
				folderId: null,
			});

		await expect(
			pasteSelection({} as never, "user-1", "ws-1", "copy", null, null, [
				{ kind: "file", id: "file-1" },
				{ kind: "file", id: "file-2" },
			]),
		).rejects.toBeInstanceOf(ValidationError);

		expect(createTransferSession).not.toHaveBeenCalled();
		expect(queueAdd).not.toHaveBeenCalled();
	});

	it("rejects pasting a folder into its own descendant", async () => {
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
			pasteSelection(
				{} as never,
				"user-1",
				"ws-1",
				"copy",
				"target-folder",
				null,
				[{ kind: "folder", id: "source-folder" }],
			),
		).rejects.toBeInstanceOf(ValidationError);

		expect(createTransferSession).not.toHaveBeenCalled();
		expect(queueAdd).not.toHaveBeenCalled();
	});
});
