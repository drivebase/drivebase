import type { IStorageProvider } from "@drivebase/core";
import type {
	Database,
	oauthProviderCredentials,
	storageProviders,
} from "@drivebase/db";
import { logger } from "../utils/logger";
import {
	createOAuthProviderCredential,
	listOAuthProviderCredentials,
} from "./provider/provider-credentials";
import {
	connectProvider,
	disconnectProvider,
	updateProviderQuota,
} from "./provider/provider-lifecycle";
import { handleOAuthCallback, initiateOAuth } from "./provider/provider-oauth";
import {
	getProvider,
	getProviderInstance,
	getProviders,
} from "./provider/provider-queries";
import { syncProvider } from "./provider/provider-sync";
import { getProviderConfigPreview } from "./provider/provider-utils";
import { getAccessibleWorkspaceId } from "./workspace/workspace";

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
		return connectProvider(
			this.db,
			workspaceId,
			userId,
			name,
			type,
			config,
			oauthCredentialId,
		);
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
		return initiateOAuth(this.db, providerId, workspaceId, source);
	}

	async handleOAuthCallback(code: string, state: string) {
		return handleOAuthCallback(this.db, code, state);
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
