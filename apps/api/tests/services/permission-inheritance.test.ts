import { beforeEach, describe, expect, it, mock } from "bun:test";
import { PermissionService } from "../../services/permission";

describe("Permission Inheritance", () => {
	let permissionService: PermissionService;
	let mockDb: any;

	beforeEach(() => {
		mockDb = {
			select: mock(() => mockDb),
			from: mock(() => mockDb),
			where: mock(() => mockDb),
			limit: mock(() => mockDb),
			returning: mock(),
		};

		permissionService = new PermissionService(mockDb);
	});

	it("should inherit permissions from parent folder", async () => {
		// Mock child folder with parent
		mockDb.returning.mockResolvedValueOnce([
			{
				id: "child-folder",
				name: "Child Folder",
				createdBy: "user2",
				parentId: "parent-folder",
			},
		]);

		// Mock no direct permission on child folder
		mockDb.returning.mockResolvedValueOnce([]);

		// Mock parent folder
		mockDb.returning.mockResolvedValueOnce([
			{
				id: "parent-folder",
				name: "Parent Folder",
				createdBy: "user2",
				parentId: null,
			},
		]);

		// Mock permission on parent folder
		mockDb.returning.mockResolvedValueOnce([
			{
				id: "perm1",
				folderId: "parent-folder",
				userId: "user1",
				role: "editor",
			},
		]);

		const result = await permissionService.canAccessFolder(
			"child-folder",
			"user1",
		);

		expect(result).toBe("editor");
	});

	it("should return owner role for folder creator even with parent permissions", async () => {
		// Mock child folder created by user1
		mockDb.returning.mockResolvedValueOnce([
			{
				id: "child-folder",
				name: "Child Folder",
				createdBy: "user1",
				parentId: "parent-folder",
			},
		]);

		const result = await permissionService.canAccessFolder(
			"child-folder",
			"user1",
		);

		expect(result).toBe("owner");
	});

	it("should prioritize direct permissions over inherited ones", async () => {
		// Mock child folder with parent
		mockDb.returning.mockResolvedValueOnce([
			{
				id: "child-folder",
				name: "Child Folder",
				createdBy: "user2",
				parentId: "parent-folder",
			},
		]);

		// Mock direct permission on child folder (editor)
		mockDb.returning.mockResolvedValueOnce([
			{
				id: "perm1",
				folderId: "child-folder",
				userId: "user1",
				role: "editor",
			},
		]);

		// Note: Parent permission check shouldn't happen since we have direct permission

		const result = await permissionService.canAccessFolder(
			"child-folder",
			"user1",
		);

		expect(result).toBe("editor");
	});

	it("should return null when user has no access in hierarchy", async () => {
		// Mock child folder
		mockDb.returning.mockResolvedValueOnce([
			{
				id: "child-folder",
				name: "Child Folder",
				createdBy: "user2",
				parentId: "parent-folder",
			},
		]);

		// Mock no permission on child folder
		mockDb.returning.mockResolvedValueOnce([]);

		// Mock parent folder
		mockDb.returning.mockResolvedValueOnce([
			{
				id: "parent-folder",
				name: "Parent Folder",
				createdBy: "user2",
				parentId: null,
			},
		]);

		// Mock no permission on parent folder
		mockDb.returning.mockResolvedValueOnce([]);

		const result = await permissionService.canAccessFolder(
			"child-folder",
			"user1",
		);

		expect(result).toBe(null);
	});
});
