import {
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { folders, permissions, users } from "@drivebase/db";
import { and, eq, inArray } from "drizzle-orm";

export type PermissionRole = "viewer" | "editor" | "admin" | "owner";

export class PermissionService {
	constructor(private db: Database) {}

	/**
	 * Grant access to a folder for a user
	 */
	async grantAccess(data: {
		folderId: string;
		userId: string;
		role: PermissionRole;
		grantedBy: string;
	}) {
		// Verify folder exists
		const [folder] = await this.db
			.select()
			.from(folders)
			.where(eq(folders.id, data.folderId))
			.limit(1);

		if (!folder) {
			throw new NotFoundError("Folder");
		}

		// Verify user exists
		const [user] = await this.db
			.select()
			.from(users)
			.where(eq(users.id, data.userId))
			.limit(1);

		if (!user) {
			throw new NotFoundError("User");
		}

		// Cannot grant owner role
		if (data.role === "owner") {
			throw new ValidationError(
				"Cannot grant owner role. Owner is automatically assigned to folder creator.",
			);
		}

		// Verify granter has permission to grant access
		const canGrant = await this.canManagePermissions(
			data.folderId,
			data.grantedBy,
		);
		if (!canGrant) {
			throw new UnauthorizedError(
				"You do not have permission to grant access to this folder",
			);
		}

		// Check if permission already exists
		const [existing] = await this.db
			.select()
			.from(permissions)
			.where(
				and(
					eq(permissions.folderId, data.folderId),
					eq(permissions.userId, data.userId),
				),
			)
			.limit(1);

		if (existing) {
			// Update existing permission
			const [updated] = await this.db
				.update(permissions)
				.set({
					role: data.role,
					grantedBy: data.grantedBy,
					updatedAt: new Date(),
				})
				.where(eq(permissions.id, existing.id))
				.returning();

			return updated;
		}

		// Create new permission
		const [permission] = await this.db
			.insert(permissions)
			.values({
				folderId: data.folderId,
				userId: data.userId,
				role: data.role,
				grantedBy: data.grantedBy,
			})
			.returning();

		return permission;
	}

	/**
	 * Revoke access to a folder from a user
	 */
	async revokeAccess(folderId: string, userId: string, revokedBy: string) {
		// Verify folder exists
		const [folder] = await this.db
			.select()
			.from(folders)
			.where(eq(folders.id, folderId))
			.limit(1);

		if (!folder) {
			throw new NotFoundError("Folder");
		}

		// Cannot revoke access from folder creator
		if (folder.createdBy === userId) {
			throw new ValidationError("Cannot revoke access from folder owner");
		}

		// Verify revoker has permission to revoke access
		const canRevoke = await this.canManagePermissions(folderId, revokedBy);
		if (!canRevoke) {
			throw new UnauthorizedError(
				"You do not have permission to revoke access to this folder",
			);
		}

		// Delete permission
		const result = await this.db
			.delete(permissions)
			.where(
				and(eq(permissions.folderId, folderId), eq(permissions.userId, userId)),
			)
			.returning();

		return result.length > 0;
	}

	/**
	 * Check if a user has permission to manage permissions on a folder
	 */
	async canManagePermissions(folderId: string, userId: string): Promise<boolean> {
		// Check if user is the folder creator (owner)
		const [folder] = await this.db
			.select()
			.from(folders)
			.where(eq(folders.id, folderId))
			.limit(1);

		if (!folder) {
			return false;
		}

		if (folder.createdBy === userId) {
			return true;
		}

		// Check if user has admin role on the folder
		const [permission] = await this.db
			.select()
			.from(permissions)
			.where(
				and(eq(permissions.folderId, folderId), eq(permissions.userId, userId)),
			)
			.limit(1);

		return permission?.role === "admin";
	}

	/**
	 * Check if a user can access a folder
	 */
	async canAccessFolder(
		folderId: string,
		userId: string,
	): Promise<PermissionRole | null> {
		// Check if user is the folder creator (owner)
		const [folder] = await this.db
			.select()
			.from(folders)
			.where(eq(folders.id, folderId))
			.limit(1);

		if (!folder) {
			return null;
		}

		if (folder.createdBy === userId) {
			return "owner";
		}

		// Check if user has explicit permission
		const [permission] = await this.db
			.select()
			.from(permissions)
			.where(
				and(eq(permissions.folderId, folderId), eq(permissions.userId, userId)),
			)
			.limit(1);

		if (permission) {
			return permission.role;
		}

		// Check parent folder permissions (inheritance)
		if (folder.parentId) {
			return this.canAccessFolder(folder.parentId, userId);
		}

		return null;
	}

	/**
	 * Get all permissions for a folder
	 */
	async getFolderPermissions(folderId: string) {
		return this.db
			.select()
			.from(permissions)
			.where(eq(permissions.folderId, folderId))
			.orderBy(permissions.createdAt);
	}

	/**
	 * Get folders shared with a user
	 */
	async getSharedWithUser(userId: string) {
		const userPermissions = await this.db
			.select({
				folder: folders,
				permission: permissions,
			})
			.from(permissions)
			.innerJoin(folders, eq(permissions.folderId, folders.id))
			.where(
				and(eq(permissions.userId, userId), eq(folders.isDeleted, false)),
			)
			.orderBy(permissions.createdAt);

		return userPermissions.map((p) => p.folder);
	}

	/**
	 * Check if user can perform action on folder based on permission role
	 */
	canPerformAction(
		role: PermissionRole | null,
		action: "view" | "edit" | "admin",
	): boolean {
		if (!role) return false;

		const roleHierarchy: Record<PermissionRole, number> = {
			viewer: 1,
			editor: 2,
			admin: 3,
			owner: 4,
		};

		const actionRequirements: Record<string, number> = {
			view: 1,
			edit: 2,
			admin: 3,
		};

		return roleHierarchy[role] >= actionRequirements[action];
	}
}
