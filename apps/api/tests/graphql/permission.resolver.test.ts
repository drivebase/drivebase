import { beforeEach, describe, expect, it, mock } from "bun:test";

const permissionServiceMock = {
	grantAccess: mock(),
	revokeAccess: mock(),
	getFolderPermissions: mock(),
	getSharedWithUser: mock(),
};

const userServiceMock = {
	findById: mock(),
};

mock.module("../../services/permission", () => ({
	PermissionService: mock(() => permissionServiceMock),
}));

mock.module("../../services/user", () => ({
	UserService: mock(() => userServiceMock),
}));

import {
	permissionMutations,
	permissionResolvers,
} from "../../graphql/resolvers/permission";

describe("permission resolvers", () => {
	beforeEach(() => {
		mock.restore();
	});

	describe("mutations", () => {
		it("grantFolderAccess creates permission", async () => {
			const mockPermission = {
				id: "perm1",
				folderId: "folder1",
				userId: "user2",
				role: "editor",
				grantedBy: "user1",
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			permissionServiceMock.grantAccess.mockResolvedValue(mockPermission);

			const context = {
				db: {},
				user: { userId: "user1" },
			} as any;

			const result = await permissionMutations.grantFolderAccess?.(
				{},
				{
					input: {
						folderId: "folder1",
						userId: "user2",
						role: "EDITOR" as any,
					},
				},
				context,
				{} as any,
			);

			expect(permissionServiceMock.grantAccess).toHaveBeenCalledWith({
				folderId: "folder1",
				userId: "user2",
				role: "editor",
				grantedBy: "user1",
			});

			expect(result?.id).toBe("perm1");
			expect(result?.role).toBe("EDITOR");
		});

		it("grantFolderAccess throws when not authenticated", async () => {
			const context = { db: {}, user: null } as any;

			await expect(
				permissionMutations.grantFolderAccess?.(
					{},
					{
						input: {
							folderId: "folder1",
							userId: "user2",
							role: "EDITOR" as any,
						},
					},
					context,
					{} as any,
				),
			).rejects.toThrow("Unauthorized");
		});

		it("revokeFolderAccess removes permission", async () => {
			permissionServiceMock.revokeAccess.mockResolvedValue(true);

			const context = {
				db: {},
				user: { userId: "user1" },
			} as any;

			const result = await permissionMutations.revokeFolderAccess?.(
				{},
				{
					folderId: "folder1",
					userId: "user2",
				},
				context,
				{} as any,
			);

			expect(permissionServiceMock.revokeAccess).toHaveBeenCalledWith(
				"folder1",
				"user2",
				"user1",
			);

			expect(result).toBe(true);
		});

		it("revokeFolderAccess throws when not authenticated", async () => {
			const context = { db: {}, user: null } as any;

			await expect(
				permissionMutations.revokeFolderAccess?.(
					{},
					{
						folderId: "folder1",
						userId: "user2",
					},
					context,
					{} as any,
				),
			).rejects.toThrow("Unauthorized");
		});
	});

	describe("type resolvers", () => {
		it("resolves user field", async () => {
			const mockUser = {
				id: "user1",
				email: "test@example.com",
				name: "Test User",
				role: "user",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			userServiceMock.findById.mockResolvedValue(mockUser);

			const parent = {
				id: "perm1",
				folderId: "folder1",
				userId: "user1",
				role: "EDITOR" as any,
				grantedBy: "user2",
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const context = { db: {} } as any;

			const result = await permissionResolvers.user?.(
				parent,
				{},
				context,
				{} as any,
			);

			expect(userServiceMock.findById).toHaveBeenCalledWith("user1");
			expect(result?.email).toBe("test@example.com");
		});

		it("resolves grantedByUser field", async () => {
			const mockUser = {
				id: "user2",
				email: "granter@example.com",
				name: "Granter",
				role: "admin",
				isActive: true,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			userServiceMock.findById.mockResolvedValue(mockUser);

			const parent = {
				id: "perm1",
				folderId: "folder1",
				userId: "user1",
				role: "EDITOR" as any,
				grantedBy: "user2",
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const context = { db: {} } as any;

			const result = await permissionResolvers.grantedByUser?.(
				parent,
				{},
				context,
				{} as any,
			);

			expect(userServiceMock.findById).toHaveBeenCalledWith("user2");
			expect(result?.email).toBe("granter@example.com");
		});
	});
});
