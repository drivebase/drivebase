import { NotFoundError, ValidationError } from "@drivebase/core";
import { files, folders, storageProviders, users } from "@drivebase/db";
import { S3Provider } from "@drivebase/s3";
import { and, eq } from "drizzle-orm";
import { getUploadQueue } from "../../queue/upload-queue";
import { FileService } from "../../services/file";
import { UploadSessionManager } from "../../services/file/upload-session";
import { ProviderService } from "../../services/provider";
import type {
	FileResolvers,
	MutationResolvers,
	QueryResolvers,
	SubscriptionResolvers,
} from "../generated/types";
import { type PubSubChannels, pubSub } from "../pubsub";
import { requireAuth } from "./auth-helpers";

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
			.where(
				and(eq(folders.id, parent.folderId), eq(folders.nodeType, "folder")),
			)
			.limit(1);

		return folder || null;
	},

	user: async (parent, _args, context) => {
		if (!parent.uploadedBy) {
			throw new NotFoundError("User");
		}
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
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		return fileService.getFile(args.id, user.userId, workspaceId);
	},

	files: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return fileService.listFiles(
			user.userId,
			workspaceId,
			args.folderId ?? undefined,
			args.limit ?? undefined,
			args.offset ?? undefined,
		);
	},

	contents: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		return fileService.getContents(
			user.userId,
			workspaceId,
			args.folderId ?? undefined,
			args.providerIds ?? undefined,
		);
	},

	searchFiles: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return fileService.searchFiles(
			user.userId,
			args.query,
			args.limit ?? undefined,
			workspaceId,
		);
	},

	searchFolders: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return fileService.searchFolders(
			user.userId,
			args.query,
			args.limit ?? undefined,
			workspaceId,
		);
	},

	recentFiles: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return fileService.getRecentFiles(
			user.userId,
			args.limit ?? undefined,
			workspaceId,
		);
	},

	starredFiles: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		return fileService.getStarredFiles(user.userId, workspaceId);
	},

	activeUploadSessions: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const sessionManager = new UploadSessionManager(context.db);
		return sessionManager.getActiveSessionsForUser(user.userId);
	},
};

export const fileMutations: MutationResolvers = {
	requestUpload: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		const result = await fileService.requestUpload(
			user.userId,
			args.input.name,
			args.input.mimeType,
			args.input.size,
			args.input.folderId ?? undefined,
			args.input.providerId,
			workspaceId,
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
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		const result = await fileService.requestDownload(
			args.id,
			user.userId,
			workspaceId,
		);

		return {
			fileId: result.file.id,
			downloadUrl: result.downloadUrl,
			useDirectDownload: result.useDirectDownload,
		};
	},

	renameFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return fileService.renameFile(args.id, user.userId, args.name, workspaceId);
	},

	moveFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return fileService.moveFile(
			args.id,
			user.userId,
			args.folderId ?? undefined,
			workspaceId,
		);
	},

	moveFileToProvider: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return fileService.moveFileToProvider(
			args.id,
			user.userId,
			args.providerId,
			workspaceId,
		);
	},

	deleteFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		await fileService.deleteFile(args.id, user.userId, workspaceId);
		return true;
	},

	starFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return fileService.starFile(args.id, user.userId, workspaceId);
	},

	unstarFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		return fileService.unstarFile(args.id, user.userId, workspaceId);
	},

	initiateChunkedUpload: async (_parent, args, context) => {
		const user = requireAuth(context);
		const fileService = new FileService(context.db);
		const sessionManager = new UploadSessionManager(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		const { input } = args;

		// Create the file record first (same as requestUpload flow)
		const uploadResult = await fileService.requestUpload(
			user.userId,
			input.name,
			input.mimeType,
			input.totalSize,
			input.folderId ?? undefined,
			input.providerId,
			workspaceId,
		);

		// Create the upload session
		const session = await sessionManager.createSession({
			fileName: input.name,
			mimeType: input.mimeType,
			totalSize: input.totalSize,
			chunkSize: input.chunkSize ? Math.floor(input.chunkSize) : undefined,
			providerId: input.providerId,
			folderId: input.folderId ?? undefined,
			userId: user.userId,
			fileId: uploadResult.file.id,
		});

		// Check if provider supports direct multipart (S3)
		const providerService = new ProviderService(context.db);
		const providerRecord = await providerService.getProvider(
			input.providerId,
			user.userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		let presignedPartUrls: Array<{ partNumber: number; url: string }> | null =
			null;

		if (provider instanceof S3Provider && provider.supportsChunkedUpload) {
			// For S3, initiate native multipart and generate presigned part URLs
			const parentId: string | undefined = undefined;

			const multipart = await provider.initiateMultipartUpload({
				name: input.name,
				mimeType: input.mimeType,
				size: input.totalSize,
				parentId,
			});

			presignedPartUrls = await provider.generatePresignedPartUrls(
				multipart.uploadId,
				multipart.remoteId,
				session.totalChunks,
			);

			// Store the S3 uploadId and remoteId in Redis for later completion
			const { getRedis } = await import("../../redis/client");
			const redis = getRedis();
			await redis.set(
				`upload:s3multipart:${session.sessionId}`,
				JSON.stringify({
					uploadId: multipart.uploadId,
					remoteId: multipart.remoteId,
				}),
				"EX",
				86400,
			);

			await provider.cleanup();
		}

		if (provider.cleanup) {
			await provider.cleanup();
		}

		return {
			sessionId: session.sessionId,
			totalChunks: session.totalChunks,
			chunkSize: session.chunkSize,
			useDirectUpload: presignedPartUrls !== null,
			presignedPartUrls,
		};
	},

	cancelUploadSession: async (_parent, args, context) => {
		const user = requireAuth(context);
		const sessionManager = new UploadSessionManager(context.db);

		await sessionManager.cancelSession(args.sessionId, user.userId);
		return true;
	},

	retryUploadSession: async (_parent, args, context) => {
		const user = requireAuth(context);
		const sessionManager = new UploadSessionManager(context.db);

		const session = await sessionManager.getSession(args.sessionId);
		if (!session) {
			throw new ValidationError("Upload session not found");
		}

		if (session.userId !== user.userId) {
			throw new ValidationError("Upload session not found");
		}

		if (session.status !== "failed") {
			throw new ValidationError("Only failed sessions can be retried");
		}

		// Re-enqueue BullMQ job for the assembled file
		const assembledPath = `/tmp/drivebase-uploads/${session.id}/assembled`;
		const queue = getUploadQueue();
		const job = await queue.add("upload-to-provider", {
			sessionId: session.id,
			fileId: session.fileId,
			providerId: session.providerId,
			assembledFilePath: assembledPath,
			fileName: session.fileName,
			mimeType: session.mimeType,
			totalSize: session.totalSize,
		});

		if (job.id) {
			await sessionManager.setBullmqJobId(session.id, job.id);
		}

		return true;
	},
	completeS3MultipartUpload: async (_parent, args, context) => {
		const user = requireAuth(context);
		const sessionManager = new UploadSessionManager(context.db);

		const session = await sessionManager.getSession(args.sessionId);
		if (!session) {
			throw new ValidationError("Upload session not found");
		}
		if (session.userId !== user.userId) {
			throw new ValidationError("Upload session not found");
		}

		// Get S3 multipart info from Redis
		const { getRedis } = await import("../../redis/client");
		const redis = getRedis();
		const multipartJson = await redis.get(
			`upload:s3multipart:${args.sessionId}`,
		);

		if (!multipartJson) {
			throw new ValidationError(
				"S3 multipart upload info not found. Session may have expired.",
			);
		}

		const { uploadId, remoteId } = JSON.parse(multipartJson) as {
			uploadId: string;
			remoteId: string;
		};

		// Get the S3 provider instance
		const providerService = new ProviderService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;
		const providerRecord = await providerService.getProvider(
			session.providerId,
			user.userId,
			workspaceId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		if (!(provider instanceof S3Provider)) {
			throw new ValidationError("Provider does not support S3 multipart");
		}

		// Complete the multipart upload
		await provider.completeMultipartUpload(
			uploadId,
			remoteId,
			args.parts.map((p) => ({
				partNumber: p.partNumber,
				etag: p.etag,
			})),
		);

		await provider.cleanup();

		// Update file record remoteId if needed
		if (session.fileId) {
			await context.db
				.update(files)
				.set({ remoteId, updatedAt: new Date() })
				.where(eq(files.id, session.fileId));
		}

		// Mark session completed
		await sessionManager.markCompleted(args.sessionId);

		// Clean up Redis
		await redis.del(`upload:s3multipart:${args.sessionId}`);

		// Publish completion event
		pubSub.publish("uploadProgress", args.sessionId, {
			sessionId: args.sessionId,
			status: "completed",
			phase: "server_to_provider",
			receivedChunks: session.totalChunks,
			totalChunks: session.totalChunks,
			providerBytesTransferred: session.totalSize,
			totalSize: session.totalSize,
			errorMessage: null,
		});

		return true;
	},
};

export const fileSubscriptions: SubscriptionResolvers = {
	uploadProgress: {
		subscribe: (_parent, args, _context) =>
			pubSub.subscribe("uploadProgress", args.sessionId),
		resolve: (payload: PubSubChannels["uploadProgress"][1]) => payload,
	},
};
