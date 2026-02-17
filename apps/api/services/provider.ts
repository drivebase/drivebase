import type { IStorageProvider } from "@drivebase/core";
import type {
	Database,
	oauthProviderCredentials,
	storageProviders,
} from "@drivebase/db";
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
import { getOwnedWorkspaceId } from "./workspace/workspace";

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
		options?: { recursive?: boolean; pruneDeleted?: boolean },
	) {
		const workspaceId = await getOwnedWorkspaceId(this.db, userId);
		return syncProvider(this.db, providerId, workspaceId, userId, options);
	}

	async connectProvider(
		userId: string,
		name: string,
		type: string,
		config: Record<string, unknown> | undefined,
		oauthCredentialId?: string,
	) {
		const workspaceId = await getOwnedWorkspaceId(this.db, userId);
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

	async initiateOAuth(providerId: string, userId: string, source?: string) {
		const workspaceId = await getOwnedWorkspaceId(this.db, userId);
		return initiateOAuth(this.db, providerId, workspaceId, source);
	}

	async handleOAuthCallback(code: string, state: string) {
		return handleOAuthCallback(this.db, code, state);
	}

	async disconnectProvider(providerId: string, userId: string) {
		const workspaceId = await getOwnedWorkspaceId(this.db, userId);
		return disconnectProvider(this.db, providerId, workspaceId);
	}

	async updateProviderQuota(
		providerId: string,
		userId: string,
		quotaTotal: number | null,
		quotaUsed: number,
	) {
		const workspaceId = await getOwnedWorkspaceId(this.db, userId);
		return updateProviderQuota(
			this.db,
			providerId,
			workspaceId,
			quotaTotal,
			quotaUsed,
		);
	}

	async getProviders(userId: string) {
		const workspaceId = await getOwnedWorkspaceId(this.db, userId);
		return getProviders(this.db, workspaceId);
	}

	async getProvider(providerId: string, userId: string) {
		const workspaceId = await getOwnedWorkspaceId(this.db, userId);
		return getProvider(this.db, providerId, workspaceId);
	}

	async getProviderInstance(
		providerRecord: typeof storageProviders.$inferSelect,
	): Promise<IStorageProvider> {
		return getProviderInstance(providerRecord);
	}
}
