import { beforeEach, describe, expect, it, mock } from "bun:test";

const getFileMock = mock();
const getFolderMock = mock();
const getProviderMock = mock();
const getProviderInstanceMock = mock();
const activityLogMock = mock();
const loggerErrorMock = mock();
const loggerDebugMock = mock();

mock.module("../../../service/file/query/file-read", () => ({
	getFile: getFileMock,
}));

mock.module("../../../service/folder/query", () => ({
	getFolder: getFolderMock,
}));

mock.module("../../../service/provider", () => ({
	ProviderService: class {
		constructor(_db: unknown) {}

		getProvider(...args: Parameters<typeof getProviderMock>) {
			return getProviderMock(...args);
		}

		getProviderInstance(...args: Parameters<typeof getProviderInstanceMock>) {
			return getProviderInstanceMock(...args);
		}
	},
}));

mock.module("../../../service/activity", () => ({
	ActivityService: class {
		constructor(_db: unknown) {}

		log(...args: Parameters<typeof activityLogMock>) {
			return activityLogMock(...args);
		}
	},
}));

mock.module("../../../utils/runtime/logger", () => ({
	logger: {
		debug: loggerDebugMock,
		error: loggerErrorMock,
	},
}));

mock.module("@drivebase/db", () => ({
	files: {
		id: "files.id",
		virtualPath: "files.virtualPath",
		nodeType: "files.nodeType",
		isDeleted: "files.isDeleted",
		name: "files.name",
	},
	storageProviders: {
		id: "storageProviders.id",
		workspaceId: "storageProviders.workspaceId",
	},
}));

mock.module("drizzle-orm", () => ({
	and: (...args: unknown[]) => ({ type: "and", args }),
	eq: (...args: unknown[]) => ({ type: "eq", args }),
}));

import { renameFile } from "../../../service/file/mutation/rename-file";

function createDb(updatedFile: Record<string, unknown>) {
	const selectChain: any = {
		from: () => selectChain,
		innerJoin: () => selectChain,
		where: () => selectChain,
		limit: async () => [],
	};

	const updateChain: any = {
		set: () => updateChain,
		where: () => ({
			returning: async () => [updatedFile],
		}),
	};

	return {
		select: () => selectChain,
		update: () => updateChain,
	};
}

describe("renameFile", () => {
	beforeEach(() => {
		getFileMock.mockReset();
		getFolderMock.mockReset();
		getProviderMock.mockReset();
		getProviderInstanceMock.mockReset();
		activityLogMock.mockReset();
		loggerErrorMock.mockReset();
		loggerDebugMock.mockReset();
	});

	it("preserves the existing parent when renaming a nested file", async () => {
		const provider = {
			move: mock(async () => undefined),
			cleanup: mock(async () => undefined),
		};
		const updatedFile = {
			id: "file-1",
			name: "renamed.txt",
			virtualPath: "/Parent/renamed.txt",
			folderId: "folder-parent",
			remoteId: "file-remote",
			providerId: "provider-1",
		};
		const db = createDb(updatedFile);

		getFileMock.mockResolvedValue({
			id: "file-1",
			name: "report.txt",
			virtualPath: "/Parent/report.txt",
			folderId: "folder-parent",
			remoteId: "file-remote",
			providerId: "provider-1",
			mimeType: "text/plain",
			size: 12,
			hash: "hash-1",
		});
		getFolderMock.mockResolvedValue({
			id: "folder-parent",
			name: "Parent",
			virtualPath: "/Parent",
			parentId: null,
			remoteId: "parent-remote",
			providerId: "provider-1",
		});
		getProviderMock.mockResolvedValue({ id: "provider-1" });
		getProviderInstanceMock.mockResolvedValue(provider);
		activityLogMock.mockResolvedValue(undefined);

		const result = await renameFile(
			db as never,
			"file-1",
			"user-1",
			"renamed.txt",
			"ws-1",
		);

		expect(provider.move).toHaveBeenCalledWith({
			remoteId: "file-remote",
			newParentId: "parent-remote",
			newName: "renamed.txt",
		});
		expect(result).toMatchObject(updatedFile);
	});
});
