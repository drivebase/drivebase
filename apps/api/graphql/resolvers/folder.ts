import { FolderService } from "../../services/folder";
import { PermissionService } from "../../services/permission";
import type { MutationResolvers, QueryResolvers, Resolvers } from "../generated/types";
import { requireAuth } from "./auth-helpers";

/**
 * Require authentication
 */

export const folderQueries: QueryResolvers = {
	folder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);
		return folderService.getFolder(args.id, user.userId);
	},

	folders: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);
		return folderService.listFolders(
			user.userId,
			args.path ?? undefined,
			args.parentId ?? undefined,
		);
	},

	starredFolders: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);
		return folderService.getStarredFolders(user.userId);
	},

	sharedWithMe: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const permissionService = new PermissionService(context.db);
		return permissionService.getSharedWithUser(user.userId);
	},
};

export const folderMutations: MutationResolvers = {
	createFolder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);

		return folderService.createFolder(
			user.userId,
			args.input.name,
			args.input.parentId ?? undefined,
			args.input.providerId ?? undefined,
		);
	},

	renameFolder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);

		return folderService.renameFolder(args.id, user.userId, args.name);
	},

	moveFolder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);

		return folderService.moveFolder(
			args.id,
			user.userId,
			args.parentId ?? undefined,
		);
	},

	deleteFolder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);

		await folderService.deleteFolder(args.id, user.userId);
		return true;
	},

	starFolder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);

		return folderService.starFolder(args.id, user.userId);
	},

	unstarFolder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);

		return folderService.unstarFolder(args.id, user.userId);
	},
};

/**
 * Folder type resolvers
 */
export const folderResolvers: Resolvers["Folder"] = {
	permissions: async (parent, _args, context) => {
		const permissionService = new PermissionService(context.db);
		const perms = await permissionService.getFolderPermissions(parent.id);

		return perms.map((p) => ({
			id: p.id,
			folderId: p.folderId,
			userId: p.userId,
			role: p.role.toUpperCase() as "VIEWER" | "EDITOR" | "ADMIN" | "OWNER",
			grantedBy: p.grantedBy,
			createdAt: p.createdAt,
			updatedAt: p.updatedAt,
		}));
	},
};
