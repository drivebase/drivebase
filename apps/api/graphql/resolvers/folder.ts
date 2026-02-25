import { NotFoundError } from "@drivebase/core";
import { files, folders, storageProviders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import { FolderService } from "../../service/folder";
import type {
	FolderResolvers,
	MutationResolvers,
	QueryResolvers,
} from "../generated/types";
import { requireAuth } from "./auth-helpers";

export const folderResolvers: FolderResolvers = {
	provider: async (parent, _args, context) => {
		const [provider] = await context.db
			.select()
			.from(storageProviders)
			.where(eq(storageProviders.id, parent.providerId))
			.limit(1);

		if (!provider) {
			throw new NotFoundError("Provider");
		}
		return provider;
	},

	parent: async (parent, _args, context) => {
		if (!parent.parentId) {
			return null;
		}
		const [folder] = await context.db
			.select()
			.from(folders)
			.where(
				and(eq(folders.id, parent.parentId), eq(folders.nodeType, "folder")),
			)
			.limit(1);
		return folder ?? null;
	},

	children: async (parent, _args, context) => {
		return context.db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.nodeType, "folder"),
					eq(folders.parentId, parent.id),
					eq(folders.isDeleted, false),
				),
			)
			.orderBy(folders.name);
	},

	files: async (parent, _args, context) => {
		return context.db
			.select()
			.from(files)
			.where(
				and(
					eq(files.nodeType, "file"),
					eq(files.folderId, parent.id),
					eq(files.isDeleted, false),
				),
			)
			.orderBy(files.name);
	},

	permissions: async () => {
		return [];
	},
};

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
			args.parentId ?? undefined,
			args.providerIds ?? undefined,
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
			args.input.providerId,
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
