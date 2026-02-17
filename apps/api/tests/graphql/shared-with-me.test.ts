import { beforeEach, describe, expect, it, mock } from "bun:test";

const folderServiceMock = {
	getSharedWithUser: mock(),
};

mock.module("../../services/permission", () => ({
	PermissionService: mock(() => folderServiceMock),
}));

import { folderQueries } from "../../graphql/resolvers/folder";

describe("sharedWithMe query", () => {
	beforeEach(() => {
		mock.restore();
	});

	it("returns folders shared with the user", async () => {
		const mockSharedFolders = [
			{
				id: "folder1",
				name: "Shared Folder 1",
				virtualPath: "/shared1",
				createdBy: "user2",
				parentId: null,
				isDeleted: false,
				starred: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: "folder2",
				name: "Shared Folder 2",
				virtualPath: "/shared2",
				createdBy: "user3",
				parentId: null,
				isDeleted: false,
				starred: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		];

		folderServiceMock.getSharedWithUser.mockResolvedValue(mockSharedFolders);

		const context = {
			db: {},
			user: { userId: "user1" },
		} as any;

		const result = await folderQueries.sharedWithMe?.(
			{},
			{},
			context,
			{} as any,
		);

		expect(folderServiceMock.getSharedWithUser).toHaveBeenCalledWith("user1");
		expect(result).toEqual(mockSharedFolders);
	});

	it("throws when not authenticated", async () => {
		const context = { db: {}, user: null } as any;

		await expect(
			folderQueries.sharedWithMe?.({}, {}, context, {} as any),
		).rejects.toThrow();
	});
});
