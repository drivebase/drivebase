import { FolderService } from "../../services/folder";
import type { MutationResolvers, QueryResolvers } from "../generated/types";
import { requireAuth } from "./auth-helpers";

/**
 * Require authentication
 */

export const folderQueries: QueryResolvers = {
	folder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		return folderService.getFolder(args.id, user.userId, workspaceId);
	},

	folders: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		return folderService.listFolders(
			user.userId,
			args.path ?? undefined,
			args.parentId ?? undefined,
			workspaceId,
		);
	},

	starredFolders: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		return folderService.getStarredFolders(user.userId, workspaceId);
	},
};

export const folderMutations: MutationResolvers = {
	createFolder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return folderService.createFolder(
			user.userId,
			args.input.name,
			args.input.parentId ?? undefined,
			workspaceId,
		);
	},

	renameFolder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return folderService.renameFolder(
			args.id,
			user.userId,
			args.name,
			workspaceId,
		);
	},

	moveFolder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return folderService.moveFolder(
			args.id,
			user.userId,
			args.parentId ?? undefined,
			workspaceId,
		);
	},

	deleteFolder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		await folderService.deleteFolder(args.id, user.userId, workspaceId);
		return true;
	},

	starFolder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return folderService.starFolder(args.id, user.userId, workspaceId);
	},

	unstarFolder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const folderService = new FolderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return folderService.unstarFolder(args.id, user.userId, workspaceId);
	},
};
