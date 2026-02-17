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

export class ProviderService {
	constructor(private db: Database) {}

	getProviderConfigPreview(
		providerRecord: typeof storageProviders.$inferSelect,
	): Array<{ key: string; value: string; isSensitive: boolean }> {
		return getProviderConfigPreview(providerRecord);
	}

	async syncProvider(
		providerId: string,
		workspaceId: string,
		actorUserId: string,
		options?: { recursive?: boolean; pruneDeleted?: boolean },
	) {
		return syncProvider(this.db, providerId, workspaceId, actorUserId, options);
	}

	async connectProvider(
		workspaceId: string,
		name: string,
		type: string,
		config: Record<string, unknown> | undefined,
		oauthCredentialId?: string,
	) {
		return connectProvider(
			this.db,
			workspaceId,
			name,
			type,
			config,
			oauthCredentialId,
		);
	}

	async listOAuthProviderCredentials(workspaceId: string, type: string) {
		return listOAuthProviderCredentials(this.db, workspaceId, type);
	}

	async createOAuthProviderCredential(
		workspaceId: string,
		type: string,
		config: Record<string, unknown>,
	): Promise<typeof oauthProviderCredentials.$inferSelect> {
		return createOAuthProviderCredential(this.db, workspaceId, type, config);
	}

	async initiateOAuth(
		providerId: string,
		workspaceId: string,
		source?: string,
	) {
		return initiateOAuth(this.db, providerId, workspaceId, source);
	}

	async handleOAuthCallback(code: string, state: string) {
		return handleOAuthCallback(this.db, code, state);
	}

	async disconnectProvider(providerId: string, workspaceId: string) {
		return disconnectProvider(this.db, providerId, workspaceId);
	}

	async updateProviderQuota(
		providerId: string,
		workspaceId: string,
		quotaTotal: number | null,
		quotaUsed: number,
	) {
		return updateProviderQuota(
			this.db,
			providerId,
			workspaceId,
			quotaTotal,
			quotaUsed,
		);
	}

	async getProviders(workspaceId: string) {
		return getProviders(this.db, workspaceId);
	}

	async getProvider(providerId: string, workspaceId: string) {
		return getProvider(this.db, providerId, workspaceId);
	}

	async getProviderInstance(
		providerRecord: typeof storageProviders.$inferSelect,
	): Promise<IStorageProvider> {
		return getProviderInstance(providerRecord);
	}
}
