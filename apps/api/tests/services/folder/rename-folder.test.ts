import { beforeEach, describe, expect, it, mock } from "bun:test";

const getFolderMock = mock();
const getWorkspaceSyncOperationsToProviderMock = mock();
const getProviderMock = mock();
const getProviderInstanceMock = mock();
const updateDescendantVirtualPathsMock = mock();

mock.module("../../../service/folder/query", () => ({
	getFolder: getFolderMock,
}));

mock.module("../../../service/workspace", () => ({
	getWorkspaceSyncOperationsToProvider:
		getWorkspaceSyncOperationsToProviderMock,
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

mock.module("../../../service/folder/mutation/shared", () => ({
	updateDescendantVirtualPaths: updateDescendantVirtualPathsMock,
}));

mock.module("@drivebase/db", () => ({
	folders: {
		id: "folders.id",
		virtualPath: "folders.virtualPath",
		nodeType: "folders.nodeType",
		workspaceId: "folders.workspaceId",
		isDeleted: "folders.isDeleted",
	},
}));

mock.module("drizzle-orm", () => ({
	and: (...args: unknown[]) => ({ type: "and", args }),
	eq: (...args: unknown[]) => ({ type: "eq", args }),
}));

import { renameFolder } from "../../../service/folder/mutation/rename-folder";

function createDb(updatedFolder: Record<string, unknown>) {
	const selectChain: any = {
		from: () => selectChain,
		where: () => selectChain,
		limit: async () => [],
	};

	const updateChain: any = {
		set: () => updateChain,
		where: () => ({
			returning: async () => [updatedFolder],
		}),
	};

	return {
		select: () => selectChain,
		update: () => updateChain,
	};
}

describe("renameFolder", () => {
	beforeEach(() => {
		getFolderMock.mockReset();
		getWorkspaceSyncOperationsToProviderMock.mockReset();
		getProviderMock.mockReset();
		getProviderInstanceMock.mockReset();
		updateDescendantVirtualPathsMock.mockReset();
	});

	it("preserves the existing parent when renaming a nested folder", async () => {
		const provider = {
			move: mock(async () => undefined),
			cleanup: mock(async () => undefined),
		};
		const updatedFolder = {
			id: "folder-child",
			name: "Renamed",
			virtualPath: "/Parent/Renamed",
			parentId: "folder-parent",
			remoteId: "child-remote",
			providerId: "provider-1",
		};
		const db = createDb(updatedFolder);

		getFolderMock
			.mockResolvedValueOnce({
				id: "folder-child",
				name: "Child",
				virtualPath: "/Parent/Child",
				parentId: "folder-parent",
				remoteId: "child-remote",
				providerId: "provider-1",
			})
			.mockResolvedValueOnce({
				id: "folder-parent",
				name: "Parent",
				virtualPath: "/Parent",
				parentId: null,
				remoteId: "parent-remote",
				providerId: "provider-1",
			});
		getWorkspaceSyncOperationsToProviderMock.mockResolvedValue(true);
		getProviderMock.mockResolvedValue({ id: "provider-1" });
		getProviderInstanceMock.mockResolvedValue(provider);

		const result = await renameFolder(
			db as never,
			"folder-child",
			"user-1",
			"ws-1",
			"Renamed",
		);

		expect(provider.move).toHaveBeenCalledWith({
			remoteId: "child-remote",
			newParentId: "parent-remote",
			newName: "Renamed",
		});
		expect(updateDescendantVirtualPathsMock).toHaveBeenCalledWith(
			db,
			"/Parent/Child",
			"/Parent/Renamed",
		);
		expect(result).toMatchObject(updatedFolder);
	});
});
