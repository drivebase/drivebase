import type { Resolvers } from "../generated/types";
import { PermissionService } from "../../services/permission";
import { UserService } from "../../services/user";
import type { GraphQLContext } from "../context";

/**
 * Permission queries
 */
export const permissionQueries: Resolvers["Query"] = {};

/**
 * Permission mutations
 */
export const permissionMutations: Resolvers["Mutation"] = {
	grantFolderAccess: async (_parent, { input }, context: GraphQLContext) => {
		if (!context.user) {
			throw new Error("Unauthorized");
		}

		const permissionService = new PermissionService(context.db);

		const permission = await permissionService.grantAccess({
			folderId: input.folderId,
			userId: input.userId,
			role: input.role.toLowerCase() as
				| "viewer"
				| "editor"
				| "admin"
				| "owner",
			grantedBy: context.user.userId,
		});

		return {
			id: permission.id,
			folderId: permission.folderId,
			userId: permission.userId,
			role: permission.role.toUpperCase() as
				| "VIEWER"
				| "EDITOR"
				| "ADMIN"
				| "OWNER",
			grantedBy: permission.grantedBy,
			createdAt: permission.createdAt,
			updatedAt: permission.updatedAt,
		};
	},

	revokeFolderAccess: async (
		_parent,
		{ folderId, userId },
		context: GraphQLContext,
	) => {
		if (!context.user) {
			throw new Error("Unauthorized");
		}

		const permissionService = new PermissionService(context.db);

		return permissionService.revokeAccess(
			folderId,
			userId,
			context.user.userId,
		);
	},
};

/**
 * Permission type resolvers
 */
export const permissionResolvers: Resolvers["Permission"] = {
	folder: async (parent, _args, context: GraphQLContext) => {
		const { folders } = await import("@drivebase/db");
		const { eq } = await import("drizzle-orm");

		const [folder] = await context.db
			.select()
			.from(folders)
			.where(eq(folders.id, parent.folderId))
			.limit(1);

		if (!folder) {
			throw new Error("Folder not found");
		}

		return {
			id: folder.id,
			virtualPath: folder.virtualPath,
			name: folder.name,
			remoteId: folder.remoteId ?? undefined,
			providerId: folder.providerId ?? undefined,
			parentId: folder.parentId ?? undefined,
			createdBy: folder.createdBy,
			isDeleted: folder.isDeleted,
			starred: folder.starred,
			createdAt: folder.createdAt,
			updatedAt: folder.updatedAt,
		};
	},

	user: async (parent, _args, context: GraphQLContext) => {
		const userService = new UserService(context.db);
		const user = await userService.findById(parent.userId);

		return {
			id: user.id,
			email: user.email,
			name: user.name ?? undefined,
			role: user.role.toUpperCase() as "ADMIN" | "USER",
			isActive: user.isActive,
			lastLoginAt: user.lastLoginAt ?? undefined,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		};
	},

	grantedByUser: async (parent, _args, context: GraphQLContext) => {
		const userService = new UserService(context.db);
		const user = await userService.findById(parent.grantedBy);

		return {
			id: user.id,
			email: user.email,
			name: user.name ?? undefined,
			role: user.role.toUpperCase() as "ADMIN" | "USER",
			isActive: user.isActive,
			lastLoginAt: user.lastLoginAt ?? undefined,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		};
	},
};
