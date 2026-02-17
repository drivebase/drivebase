import { beforeEach, describe, expect, it, mock } from "bun:test";
import { PermissionService } from "../../services/permission";
import {
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from "@drivebase/core";

describe("PermissionService", () => {
	let permissionService: PermissionService;
	let mockDb: any;

	beforeEach(() => {
		mockDb = {
			select: mock(() => mockDb),
			from: mock(() => mockDb),
			where: mock(() => mockDb),
			limit: mock(() => mockDb),
			insert: mock(() => mockDb),
			values: mock(() => mockDb),
			returning: mock(),
			update: mock(() => mockDb),
			set: mock(() => mockDb),
			delete: mock(() => mockDb),
			innerJoin: mock(() => mockDb),
			orderBy: mock(() => mockDb),
		};

		permissionService = new PermissionService(mockDb);
	});

	describe("grantAccess", () => {
		it("should grant access when user has permission to grant", async () => {
			// Mock folder exists
			mockDb.returning.mockResolvedValueOnce([
				{
					id: "folder1",
					name: "Test Folder",
					createdBy: "user1",
					parentId: null,
				},
			]);

			// Mock user exists
			mockDb.returning.mockResolvedValueOnce([{ id: "user2", email: "test@example.com" }]);

			// Mock granter is folder owner
			mockDb.returning.mockResolvedValueOnce([
				{
					id: "folder1",
					name: "Test Folder",
					createdBy: "user1",
					parentId: null,
				},
			]);

			// Mock no existing permission
			mockDb.returning.mockResolvedValueOnce([]);

			// Mock successful permission creation
			mockDb.returning.mockResolvedValueOnce([
				{
					id: "perm1",
					folderId: "folder1",
					userId: "user2",
					role: "editor",
					grantedBy: "user1",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			]);

			const result = await permissionService.grantAccess({
				folderId: "folder1",
				userId: "user2",
				role: "editor",
				grantedBy: "user1",
			});

			expect(result.folderId).toBe("folder1");
			expect(result.userId).toBe("user2");
			expect(result.role).toBe("editor");
		});

		it("should throw NotFoundError when folder does not exist", async () => {
			mockDb.returning.mockResolvedValueOnce([]);

			await expect(
				permissionService.grantAccess({
					folderId: "nonexistent",
					userId: "user2",
					role: "editor",
					grantedBy: "user1",
				}),
			).rejects.toThrow(NotFoundError);
		});

		it("should throw NotFoundError when user does not exist", async () => {
			// Mock folder exists
			mockDb.returning.mockResolvedValueOnce([{ id: "folder1", name: "Test Folder" }]);

			// Mock user doesn't exist
			mockDb.returning.mockResolvedValueOnce([]);

			await expect(
				permissionService.grantAccess({
					folderId: "folder1",
					userId: "nonexistent",
					role: "editor",
					grantedBy: "user1",
				}),
			).rejects.toThrow(NotFoundError);
		});

		it("should throw ValidationError when trying to grant owner role", async () => {
			// Mock folder exists
			mockDb.returning.mockResolvedValueOnce([{ id: "folder1", name: "Test Folder" }]);

			// Mock user exists
			mockDb.returning.mockResolvedValueOnce([{ id: "user2", email: "test@example.com" }]);

			await expect(
				permissionService.grantAccess({
					folderId: "folder1",
					userId: "user2",
					role: "owner",
					grantedBy: "user1",
				}),
			).rejects.toThrow(ValidationError);
		});
	});

	describe("revokeAccess", () => {
		it("should revoke access when user has permission", async () => {
			// Mock folder exists and granter is owner
			mockDb.returning.mockResolvedValueOnce([
				{
					id: "folder1",
					name: "Test Folder",
					createdBy: "user1",
				},
			]);

			// Mock granter is folder owner
			mockDb.returning.mockResolvedValueOnce([
				{
					id: "folder1",
					name: "Test Folder",
					createdBy: "user1",
				},
			]);

			// Mock successful deletion
			mockDb.returning.mockResolvedValueOnce([{ id: "perm1" }]);

			const result = await permissionService.revokeAccess(
				"folder1",
				"user2",
				"user1",
			);

			expect(result).toBe(true);
		});

		it("should throw NotFoundError when folder does not exist", async () => {
			mockDb.returning.mockResolvedValueOnce([]);

			await expect(
				permissionService.revokeAccess("nonexistent", "user2", "user1"),
			).rejects.toThrow(NotFoundError);
		});

		it("should throw ValidationError when trying to revoke from owner", async () => {
			mockDb.returning.mockResolvedValueOnce([
				{
					id: "folder1",
					name: "Test Folder",
					createdBy: "user2", // user2 is the owner
				},
			]);

			await expect(
				permissionService.revokeAccess("folder1", "user2", "user1"),
			).rejects.toThrow(ValidationError);
		});
	});

	describe("canAccessFolder", () => {
		it("should return owner role for folder creator", async () => {
			mockDb.returning.mockResolvedValueOnce([
				{
					id: "folder1",
					name: "Test Folder",
					createdBy: "user1",
					parentId: null,
				},
			]);

			const result = await permissionService.canAccessFolder("folder1", "user1");

			expect(result).toBe("owner");
		});

		it("should return null when folder does not exist", async () => {
			mockDb.returning.mockResolvedValueOnce([]);

			const result = await permissionService.canAccessFolder(
				"nonexistent",
				"user1",
			);

			expect(result).toBe(null);
		});

		it("should return explicit permission role when user has permission", async () => {
			// Mock folder exists but user is not creator
			mockDb.returning.mockResolvedValueOnce([
				{
					id: "folder1",
					name: "Test Folder",
					createdBy: "user2",
					parentId: null,
				},
			]);

			// Mock user has explicit permission
			mockDb.returning.mockResolvedValueOnce([
				{
					id: "perm1",
					folderId: "folder1",
					userId: "user1",
					role: "editor",
				},
			]);

			const result = await permissionService.canAccessFolder("folder1", "user1");

			expect(result).toBe("editor");
		});
	});

	describe("canPerformAction", () => {
		it("should allow viewer to view", () => {
			expect(permissionService.canPerformAction("viewer", "view")).toBe(true);
		});

		it("should not allow viewer to edit", () => {
			expect(permissionService.canPerformAction("viewer", "edit")).toBe(false);
		});

		it("should allow editor to view and edit", () => {
			expect(permissionService.canPerformAction("editor", "view")).toBe(true);
			expect(permissionService.canPerformAction("editor", "edit")).toBe(true);
		});

		it("should not allow editor to perform admin actions", () => {
			expect(permissionService.canPerformAction("editor", "admin")).toBe(false);
		});

		it("should allow admin to perform all actions", () => {
			expect(permissionService.canPerformAction("admin", "view")).toBe(true);
			expect(permissionService.canPerformAction("admin", "edit")).toBe(true);
			expect(permissionService.canPerformAction("admin", "admin")).toBe(true);
		});

		it("should allow owner to perform all actions", () => {
			expect(permissionService.canPerformAction("owner", "view")).toBe(true);
			expect(permissionService.canPerformAction("owner", "edit")).toBe(true);
			expect(permissionService.canPerformAction("owner", "admin")).toBe(true);
		});

		it("should return false when role is null", () => {
			expect(permissionService.canPerformAction(null, "view")).toBe(false);
		});
	});
});
