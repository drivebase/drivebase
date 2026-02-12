import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { eq, and } from "drizzle-orm";
import type { IStorageProvider } from "@drivebase/core";
import { NotFoundError, ValidationError, ProviderError } from "@drivebase/core";
import {
	getProviderRegistration,
	getSensitiveFields,
} from "../config/providers";
import { encryptConfig, decryptConfig } from "../utils/encryption";
import { env } from "../config/env";

export class ProviderService {
	constructor(private db: Database) {}

	private maskSensitiveValue(value: unknown): string {
		const raw = String(value ?? "");
		if (raw.length <= 4) return "••••";
		return `${"•".repeat(Math.min(8, raw.length - 4))}${raw.slice(-4)}`;
	}

	getProviderConfigPreview(
		providerRecord: typeof storageProviders.$inferSelect,
	): Array<{ key: string; value: string; isSensitive: boolean }> {
		const sensitiveFields = getSensitiveFields(providerRecord.type);
		const decryptedConfig = decryptConfig(
			providerRecord.encryptedConfig,
			sensitiveFields,
		);

		return Object.entries(decryptedConfig).map(([key, value]) => {
			const isSensitive = sensitiveFields.includes(key);
			return {
				key,
				value: isSensitive
					? this.maskSensitiveValue(value)
					: String(value ?? ""),
				isSensitive,
			};
		});
	}

	/**
	 * Fixed OAuth callback URL — must match exactly what is registered
	 * in the provider's developer console (e.g. Google Cloud Console).
	 * The provider ID is carried in the OAuth state parameter instead.
	 */
	private buildCallbackUrl(): string {
		const baseUrl = env.API_BASE_URL ?? `http://localhost:${env.PORT}`;
		return `${baseUrl}/webhook/callback`;
	}

	/**
	 * Connect a new storage provider.
	 *
	 * For OAuth providers (authType = 'oauth') the connection is saved immediately
	 * without testing — the actual auth happens when the user completes the OAuth
	 * flow via initiateProviderOAuth + the /webhook/callback/:id route.
	 *
	 * For non-OAuth providers the config is validated, the connection is tested,
	 * and quota is fetched before saving.
	 */
	async connectProvider(
		userId: string,
		name: string,
		type: string,
		config: Record<string, unknown>,
	) {
		const registration = getProviderRegistration(type);

		// Validate config using provider schema
		const schema = registration.configSchema as {
			safeParse: (v: unknown) => {
				success: boolean;
				error?: { errors: unknown[] };
			};
		};
		const validation = schema.safeParse(config);

		if (!validation.success) {
			throw new ValidationError("Invalid provider configuration", {
				errors: validation.error?.errors,
			});
		}

		const sensitiveFields = getSensitiveFields(type);

		if (registration.authType === "oauth") {
			// OAuth providers: store config immediately — no connection test yet.
			// The tokens will be added after the OAuth callback completes.
			const encryptedConfig = encryptConfig(config, sensitiveFields);

			const [savedProvider] = await this.db
				.insert(storageProviders)
				.values({
					name,
					type: type as "google_drive" | "s3" | "local",
					authType: "oauth",
					encryptedConfig,
					userId,
					isActive: false, // Not active until OAuth completes
					quotaUsed: 0,
				})
				.returning();

			if (!savedProvider) {
				throw new Error("Failed to save provider");
			}

			return savedProvider;
		}

		// Non-OAuth providers: initialize, test connection, fetch quota
		const provider = registration.factory();
		await provider.initialize(config);

		const connected = await provider.testConnection();
		if (!connected) {
			throw new ProviderError(type, "Failed to connect to provider");
		}

		const quota = await provider.getQuota();
		await provider.cleanup();

		const encryptedConfig = encryptConfig(config, sensitiveFields);

		const [savedProvider] = await this.db
			.insert(storageProviders)
			.values({
				name,
				type: type as "google_drive" | "s3" | "local",
				authType: registration.authType,
				encryptedConfig,
				userId,
				isActive: true,
				quotaTotal: quota.total ?? null,
				quotaUsed: quota.used,
				lastSyncAt: new Date(),
			})
			.returning();

		if (!savedProvider) {
			throw new Error("Failed to save provider");
		}

		return savedProvider;
	}

	/**
	 * Initiate an OAuth flow for an existing provider record.
	 * Returns the authorization URL and state token to send to the frontend.
	 */
	async initiateOAuth(providerId: string, userId: string) {
		const providerRecord = await this.getProvider(providerId, userId);

		const registration = getProviderRegistration(providerRecord.type);

		if (registration.authType !== "oauth" || !registration.initiateOAuth) {
			throw new ProviderError(
				providerRecord.type,
				"This provider does not support OAuth",
			);
		}

		const sensitiveFields = getSensitiveFields(providerRecord.type);
		const config = decryptConfig(
			providerRecord.encryptedConfig,
			sensitiveFields,
		);

		// Encode provider ID + random CSRF token into state
		const state = `${providerId}:${crypto.randomUUID()}`;
		const callbackUrl = this.buildCallbackUrl();
		return registration.initiateOAuth(config, callbackUrl, state);
	}

	/**
	 * Handle the OAuth callback for a provider.
	 * Called by the GET /webhook/callback HTTP route — NOT authenticated via GraphQL.
	 * The provider ID is extracted from the state parameter (format: "<providerId>:<csrfToken>").
	 * Exchanges the code for tokens, updates the stored config, and activates the provider.
	 */
	async handleOAuthCallback(code: string, state: string) {
		// Extract provider ID from state (format: "<providerId>:<csrfToken>")
		const providerId = state.split(":")[0];
		if (!providerId) {
			throw new ValidationError("Invalid OAuth state parameter");
		}

		const [providerRecord] = await this.db
			.select()
			.from(storageProviders)
			.where(eq(storageProviders.id, providerId))
			.limit(1);

		if (!providerRecord) {
			throw new NotFoundError("Provider");
		}

		const registration = getProviderRegistration(providerRecord.type);

		if (
			registration.authType !== "oauth" ||
			!registration.handleOAuthCallback
		) {
			throw new ProviderError(
				providerRecord.type,
				"This provider does not support OAuth",
			);
		}

		const sensitiveFields = getSensitiveFields(providerRecord.type);
		const config = decryptConfig(
			providerRecord.encryptedConfig,
			sensitiveFields,
		);

		const callbackUrl = this.buildCallbackUrl();
		const updatedConfig = await registration.handleOAuthCallback(
			config,
			code,
			callbackUrl,
		);

		// Initialize provider with the new tokens to create the root folder
		const provider = registration.factory();
		await provider.initialize(updatedConfig);

		const rootFolderId = await provider.createFolder({
			name: "Drivebase",
		});

		const quota = await provider.getQuota();

		let accountEmail: string | null = null;
		let accountName: string | null = null;
		const maybeAccountInfo = (
			provider as {
				getAccountInfo?: () => Promise<{ email?: string; name?: string }>;
			}
		).getAccountInfo;
		if (maybeAccountInfo) {
			const accountInfo = await maybeAccountInfo.call(provider);
			accountEmail = accountInfo.email ?? null;
			accountName = accountInfo.name ?? null;
		}

		await provider.cleanup();

		// Encrypt updated config (now contains tokens) and activate the provider
		const encryptedConfig = encryptConfig(updatedConfig, sensitiveFields);

		const [updated] = await this.db
			.update(storageProviders)
			.set({
				encryptedConfig,
				isActive: true,
				accountEmail,
				accountName,
				rootFolderId,
				quotaTotal: quota.total ?? null,
				quotaUsed: quota.used,
				lastSyncAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(storageProviders.id, providerId))
			.returning();

		if (!updated) {
			throw new Error("Failed to update provider after OAuth callback");
		}

		return updated;
	}

	/**
	 * Disconnect and remove a storage provider
	 */
	async disconnectProvider(providerId: string, userId: string) {
		const [provider] = await this.db
			.select()
			.from(storageProviders)
			.where(
				and(
					eq(storageProviders.id, providerId),
					eq(storageProviders.userId, userId),
				),
			)
			.limit(1);

		if (!provider) {
			throw new NotFoundError("Provider");
		}

		await this.db
			.delete(storageProviders)
			.where(eq(storageProviders.id, providerId));
	}

	/**
	 * Sync provider quota
	 */
	async syncProvider(providerId: string, userId: string) {
		const [providerRecord] = await this.db
			.select()
			.from(storageProviders)
			.where(
				and(
					eq(storageProviders.id, providerId),
					eq(storageProviders.userId, userId),
				),
			)
			.limit(1);

		if (!providerRecord) {
			throw new NotFoundError("Provider");
		}

		const provider = await this.getProviderInstance(providerRecord);

		const quota = await provider.getQuota();

		const [updated] = await this.db
			.update(storageProviders)
			.set({
				quotaTotal: quota.total ?? null,
				quotaUsed: quota.used,
				lastSyncAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(storageProviders.id, providerId))
			.returning();

		if (!updated) {
			throw new Error("Failed to update provider");
		}

		await provider.cleanup();

		return updated;
	}

	/**
	 * Update provider quota values manually
	 */
	async updateProviderQuota(
		providerId: string,
		userId: string,
		quotaTotal: number | null,
		quotaUsed: number,
	) {
		const [providerRecord] = await this.db
			.select()
			.from(storageProviders)
			.where(
				and(
					eq(storageProviders.id, providerId),
					eq(storageProviders.userId, userId),
				),
			)
			.limit(1);

		if (!providerRecord) {
			throw new NotFoundError("Provider");
		}

		if (quotaUsed < 0) {
			throw new ValidationError("quotaUsed must be >= 0");
		}

		if (quotaTotal !== null && quotaTotal < 0) {
			throw new ValidationError("quotaTotal must be >= 0");
		}

		if (quotaTotal !== null && quotaUsed > quotaTotal) {
			throw new ValidationError("quotaUsed cannot exceed quotaTotal");
		}

		const [updated] = await this.db
			.update(storageProviders)
			.set({
				quotaTotal: quotaTotal ?? null,
				quotaUsed,
				updatedAt: new Date(),
			})
			.where(eq(storageProviders.id, providerId))
			.returning();

		if (!updated) {
			throw new Error("Failed to update provider quota");
		}

		return updated;
	}

	/**
	 * Get all storage providers for a user
	 */
	async getProviders(userId: string) {
		return this.db
			.select()
			.from(storageProviders)
			.where(eq(storageProviders.userId, userId))
			.orderBy(storageProviders.createdAt);
	}

	/**
	 * Get a single storage provider
	 */
	async getProvider(providerId: string, userId: string) {
		const [provider] = await this.db
			.select()
			.from(storageProviders)
			.where(
				and(
					eq(storageProviders.id, providerId),
					eq(storageProviders.userId, userId),
				),
			)
			.limit(1);

		if (!provider) {
			throw new NotFoundError("Provider");
		}

		return provider;
	}

	/**
	 * Get an initialized provider instance
	 */
	async getProviderInstance(
		providerRecord: typeof storageProviders.$inferSelect,
	): Promise<IStorageProvider> {
		const registration = getProviderRegistration(providerRecord.type);

		const provider = registration.factory();

		const sensitiveFields = getSensitiveFields(providerRecord.type);
		const decryptedConfig = decryptConfig(
			providerRecord.encryptedConfig,
			sensitiveFields,
		);

		await provider.initialize(decryptedConfig);

		return provider;
	}
}
