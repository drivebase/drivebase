import { S3Provider } from "@drivebase/s3";
import type { MutationResolvers, QueryResolvers } from "../generated/types";
import { requireAuth } from "./auth-helpers";
import { ProviderService } from "../../services/provider";
import { UploadSessionManager } from "../../services/file/upload-session";
import { VaultService } from "../../services/vault";
import { getRedis } from "../../redis/client";

export const vaultQueries: QueryResolvers = {
	myVault: async (_parent, _args, context) => {
		const user = requireAuth(context);
		const vaultService = new VaultService(context.db);
		return vaultService.getVault(user.userId);
	},

	vaultContents: async (_parent, args, context) => {
		const user = requireAuth(context);
		const vaultService = new VaultService(context.db);
		return vaultService.getVaultContents(user.userId, args.path);
	},
};

export const vaultMutations: MutationResolvers = {
	setupVault: async (_parent, args, context) => {
		const user = requireAuth(context);
		const vaultService = new VaultService(context.db);
		return vaultService.setupVault(
			user.userId,
			args.input.publicKey,
			args.input.encryptedPrivateKey,
			args.input.kekSalt,
		);
	},

	changeVaultPassphrase: async (_parent, args, context) => {
		const user = requireAuth(context);
		const vaultService = new VaultService(context.db);
		return vaultService.changePassphrase(
			user.userId,
			args.input.encryptedPrivateKey,
			args.input.kekSalt,
		);
	},

	requestVaultUpload: async (_parent, args, context) => {
		const user = requireAuth(context);
		const vaultService = new VaultService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		const providerService = new ProviderService(context.db);
		const resolvedWorkspaceId = workspaceId
			? workspaceId
			: await (async () => {
					const { getAccessibleWorkspaceId } = await import(
						"../../services/workspace/workspace"
					);
					return getAccessibleWorkspaceId(context.db, user.userId);
				})();

		return vaultService.requestVaultUpload(
			user.userId,
			resolvedWorkspaceId,
			args.input.name,
			args.input.mimeType,
			args.input.size,
			args.input.folderId ?? undefined,
			args.input.providerId,
			args.input.encryptedFileKey,
		);
	},

	requestVaultDownload: async (_parent, args, context) => {
		const user = requireAuth(context);
		const vaultService = new VaultService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		const resolvedWorkspaceId = workspaceId
			? workspaceId
			: await (async () => {
					const { getAccessibleWorkspaceId } = await import(
						"../../services/workspace/workspace"
					);
					return getAccessibleWorkspaceId(context.db, user.userId);
				})();

		const result = await vaultService.requestVaultDownload(
			user.userId,
			resolvedWorkspaceId,
			args.id,
		);

		return {
			fileId: result.fileId,
			downloadUrl: result.downloadUrl,
			useDirectDownload: result.useDirectDownload,
			encryptedFileKey: result.encryptedFileKey,
		};
	},

	createVaultFolder: async (_parent, args, context) => {
		const user = requireAuth(context);
		const vaultService = new VaultService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		const resolvedWorkspaceId = workspaceId
			? workspaceId
			: await (async () => {
					const { getAccessibleWorkspaceId } = await import(
						"../../services/workspace/workspace"
					);
					return getAccessibleWorkspaceId(context.db, user.userId);
				})();

		return vaultService.createVaultFolder(
			user.userId,
			resolvedWorkspaceId,
			args.name,
			args.parentId ?? undefined,
		);
	},

	deleteVaultFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const vaultService = new VaultService(context.db);
		await vaultService.deleteVaultFile(user.userId, args.id);
		return true;
	},

	renameVaultFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const vaultService = new VaultService(context.db);
		return vaultService.renameVaultFile(user.userId, args.id, args.name);
	},

	starVaultFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const vaultService = new VaultService(context.db);
		return vaultService.starVaultFile(user.userId, args.id);
	},

	unstarVaultFile: async (_parent, args, context) => {
		const user = requireAuth(context);
		const vaultService = new VaultService(context.db);
		return vaultService.unstarVaultFile(user.userId, args.id);
	},

	initiateVaultChunkedUpload: async (_parent, args, context) => {
		const user = requireAuth(context);
		const vaultService = new VaultService(context.db);
		const workspaceId = context.headers?.get("x-workspace-id") ?? undefined;

		const resolvedWorkspaceId = workspaceId
			? workspaceId
			: await (async () => {
					const { getAccessibleWorkspaceId } = await import(
						"../../services/workspace/workspace"
					);
					return getAccessibleWorkspaceId(context.db, user.userId);
				})();

		const { input } = args;

		const { file: fileRecord, providerRecord } =
			await vaultService.prepareVaultChunkedUpload(
				user.userId,
				resolvedWorkspaceId,
				input.name,
				input.mimeType,
				input.totalSize,
				input.folderId ?? undefined,
				input.providerId,
				input.encryptedFileKey,
				input.encryptedChunkSize ?? undefined,
			);

		const sessionManager = new UploadSessionManager(context.db);
		const session = await sessionManager.createSession({
			fileName: input.name,
			mimeType: input.mimeType,
			totalSize: input.totalSize,
			chunkSize: input.chunkSize ? Math.floor(input.chunkSize) : undefined,
			providerId: input.providerId,
			folderId: input.folderId ?? undefined,
			userId: user.userId,
			fileId: fileRecord.id,
		});

		// Check if provider supports direct S3 multipart
		const providerService = new ProviderService(context.db);
		const provider = await providerService.getProviderInstance(providerRecord);

		let presignedPartUrls: Array<{ partNumber: number; url: string }> | null =
			null;

		if (provider instanceof S3Provider && provider.supportsChunkedUpload) {
			const multipart = await provider.initiateMultipartUpload({
				name: input.name,
				mimeType: input.mimeType,
				size: input.totalSize,
				parentId: providerRecord.rootFolderId ?? undefined,
			});

			presignedPartUrls = await provider.generatePresignedPartUrls(
				multipart.uploadId,
				multipart.remoteId,
				session.totalChunks,
			);

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
};
