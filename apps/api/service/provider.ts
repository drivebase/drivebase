import type { IStorageProvider } from "@drivebase/core";
import type {
	Database,
	oauthProviderCredentials,
	storageProviders,
} from "@drivebase/db";
import {
	connectProvider,
	createOAuthProviderCredential,
	disconnectProvider,
	handleOAuthCallback,
	initiateOAuth,
	pollProviderAuth,
	renameProvider,
	scheduleInitialProviderSync,
	syncProvider,
	updateProviderQuota,
} from "@/service/provider/mutation";
import {
	getProvider,
	getProviderConfigPreview,
	getProviderInstance,
	getProviders,
	listOAuthProviderCredentials,
} from "@/service/provider/query";
import { ActivityService } from "./activity";
import { logger } from "../utils/logger";
import { getAccessibleWorkspaceId } from "./workspace";

export class ProviderService {
	constructor(private db: Database) {}

	getProviderConfigPreview(
		providerRecord: typeof storageProviders.$inferSelect,
	): Array<{ key: string; value: string; isSensitive: boolean }> {
		return getProviderConfigPreview(providerRecord);
	}

	async syncProvider(
		providerId: string,
		userId: string,
		preferredWorkspaceId?: string,
		options?: { recursive?: boolean; pruneDeleted?: boolean },
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return syncProvider(this.db, providerId, workspaceId, userId, options);
	}

	async connectProvider(
		userId: string,
		name: string,
		type: string,
		config: Record<string, unknown> | undefined,
		oauthCredentialId?: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		try {
			const provider = await connectProvider(
				this.db,
				workspaceId,
				userId,
				name,
				type,
				config,
				oauthCredentialId,
			);

			// Trigger an initial background sync for active providers.
			if (provider.isActive) {
				await scheduleInitialProviderSync({
					db: this.db,
					providerId: provider.id,
					workspaceId,
					userId,
					context: "connectProvider",
				});

				await new ActivityService(this.db).log({
					kind: "provider.connected",
					title: "Provider connected",
					summary: provider.name,
					status: "success",
					userId,
					workspaceId,
					details: {
						providerId: provider.id,
						providerType: provider.type,
						authType: provider.authType,
					},
				});
			}

			return provider;
		} catch (error) {
			await new ActivityService(this.db).log({
				kind: "provider.connect.failed",
				title: "Provider connection failed",
				summary: name,
				status: "error",
				userId,
				workspaceId,
				details: {
					providerType: type,
					error: error instanceof Error ? error.message : String(error),
				},
			});
			throw error;
		}
	}

	async listOAuthProviderCredentials(userId: string, type: string) {
		return listOAuthProviderCredentials(this.db, userId, type);
	}

	async createOAuthProviderCredential(
		userId: string,
		type: string,
		config: Record<string, unknown>,
	): Promise<typeof oauthProviderCredentials.$inferSelect> {
		return createOAuthProviderCredential(this.db, userId, type, config);
	}

	async initiateOAuth(
		providerId: string,
		userId: string,
		source?: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		logger.debug({
			msg: "Resolved workspace for provider oauth initiation",
			userId,
			workspaceId,
			providerId,
			source,
		});
		return initiateOAuth(this.db, providerId, workspaceId, userId, source);
	}

	async handleOAuthCallback(code: string, state: string) {
		const result = await handleOAuthCallback(this.db, code, state);
		if (result.actorUserId) {
			await new ActivityService(this.db).log({
				kind: "provider.connected",
				title: "Provider connected",
				summary: result.provider.name,
				status: "success",
				userId: result.actorUserId,
				workspaceId: result.provider.workspaceId,
				details: {
					providerId: result.provider.id,
					providerType: result.provider.type,
					authType: result.provider.authType,
					source: result.source,
				},
			});
		}
		return result;
	}

	async pollProviderAuth(
		providerId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		const result = await pollProviderAuth(
			this.db,
			providerId,
			workspaceId,
			userId,
		);
		if (result.status === "success") {
			await new ActivityService(this.db).log({
				kind: "provider.connected",
				title: "Provider connected",
				summary: result.provider.name,
				status: "success",
				userId,
				workspaceId,
				details: {
					providerId: result.provider.id,
					providerType: result.provider.type,
					authType: result.provider.authType,
					source: "poll",
				},
			});
		}
		return result;
	}

	async disconnectProvider(
		providerId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		logger.debug({
			msg: "Resolved workspace for provider disconnect",
			userId,
			workspaceId,
			providerId,
		});
		return disconnectProvider(this.db, providerId, workspaceId);
	}

	async updateProviderQuota(
		providerId: string,
		userId: string,
		quotaTotal: number | null,
		quotaUsed: number,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		logger.debug({
			msg: "Resolved workspace for provider quota update",
			userId,
			workspaceId,
			providerId,
		});
		return updateProviderQuota(
			this.db,
			providerId,
			workspaceId,
			quotaTotal,
			quotaUsed,
		);
	}

	async renameProvider(
		providerId: string,
		userId: string,
		name: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		logger.debug({
			msg: "Resolved workspace for provider rename",
			userId,
			workspaceId,
			providerId,
		});
		return renameProvider(this.db, providerId, workspaceId, name);
	}

	async getProviders(userId: string, preferredWorkspaceId?: string) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		return getProviders(this.db, workspaceId);
	}

	async getProvider(
		providerId: string,
		userId: string,
		preferredWorkspaceId?: string,
	) {
		const workspaceId = await getAccessibleWorkspaceId(
			this.db,
			userId,
			preferredWorkspaceId,
		);
		logger.debug({
			msg: "Resolved workspace for provider fetch",
			userId,
			workspaceId,
			providerId,
		});
		return getProvider(this.db, providerId, workspaceId);
	}

	async getProviderInstance(
		providerRecord: typeof storageProviders.$inferSelect,
	): Promise<IStorageProvider> {
		return getProviderInstance(providerRecord);
	}
}
