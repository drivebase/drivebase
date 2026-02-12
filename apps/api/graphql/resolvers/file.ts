import type {
	MutationResolvers,
	QueryResolvers,
	FileResolvers,
} from "../generated/types";
import type { GraphQLContext } from "../context";
import { requireAuth } from "./auth-helpers";
import { NotFoundError } from "@drivebase/core";
import { FileService } from "../../services/file";
import { storageProviders, folders, users } from "@drivebase/db";
import { eq } from "drizzle-orm";

/**
 * Require authentication
 */

export const fileResolvers: FileResolvers = {
	provider: async (parent, _args, context) => {
		// We assume access to the file implies access to see provider basic info
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

	folder: async (parent, _args, context) => {
		if (!parent.folderId) {
			return null;
		}
		const [folder] = await context.db
			.select()
			.from(folders)
			.where(eq(folders.id, parent.folderId))
			.limit(1);

		return folder || null;
	},

	user: async (parent, _args, context) => {
		const [user] = await context.db
			.select()
			.from(users)
			.where(eq(users.id, parent.uploadedBy))
			.limit(1);

		if (!user) {
			throw new NotFoundError("User");
		}
		return user;
	},
};

export const fileQueries: QueryResolvers = {
	file: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		return fileService.getFile(args.id, user.userId);
	},

	files: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);

		return fileService.listFiles(
			user.userId,
			args.folderId ?? undefined,
			args.limit ?? undefined,
			args.offset ?? undefined,
		);
	},

	contents: async (_parent, args, context) => {
		requireAuth(context);
		const fileService = new FileService(context.db);
		return fileService.getContents(args.path);
	},

	searchFiles: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);

		return fileService.searchFiles(
			user.userId,
			args.query,
			args.limit ?? undefined,
		);
	},

	starredFiles: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		return fileService.getStarredFiles(user.userId);
	},
};

export const fileMutations: MutationResolvers = {
	requestUpload: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);

		const result = await fileService.requestUpload(
			user.userId,
			args.input.name,
			args.input.mimeType,
			args.input.size,
			args.input.folderId ?? undefined,
			args.input.providerId,
		);

		return {
			fileId: result.file.id,
			uploadUrl: result.uploadUrl,
			uploadFields: result.uploadFields,
			useDirectUpload: result.useDirectUpload,
		};
	},

	requestDownload: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const result = await fileService.requestDownload(args.id, user.userId);

		return {
			fileId: result.file.id,
			downloadUrl: result.downloadUrl,
			useDirectDownload: result.useDirectDownload,
		};
	},

	renameFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);

		return fileService.renameFile(args.id, user.userId, args.name);
	},

	moveFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);

		return fileService.moveFile(
			args.id,
			user.userId,
			args.folderId ?? undefined,
		);
	},

	deleteFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);

		await fileService.deleteFile(args.id, user.userId);
		return true;
	},

	starFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);

		return fileService.starFile(args.id, user.userId);
	},

	unstarFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);

		return fileService.unstarFile(args.id, user.userId);
	},
};
