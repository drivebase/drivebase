import type { MutationResolvers, QueryResolvers } from "../generated/types";
import type { GraphQLContext } from "../context";
import { requireAuth } from "./auth-helpers";
import { FolderService } from "../../services/folder";

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
