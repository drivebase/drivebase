import { NotFoundError, ProviderError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import {
	getProviderRegistration,
	getSensitiveFields,
} from "../../config/providers";
import { encryptConfig } from "../../utils/encryption";
import { logger } from "../../utils/logger";

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
export async function connectProvider(
	db: Database,
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
		const encryptedConfig = encryptConfig(config, sensitiveFields);

		try {
			const [savedProvider] = await db
				.insert(storageProviders)
				.values({
					name,
					type: type as "google_drive" | "s3" | "local",
					authType: "oauth",
					encryptedConfig,
					userId,
					isActive: false,
					quotaUsed: 0,
				})
				.returning();

			if (!savedProvider) {
				throw new Error("Failed to save provider");
			}

			return savedProvider;
		} catch (error) {
			logger.error({
				msg: "Failed to insert OAuth provider",
				error,
				userId,
				type,
			});
			throw error;
		}
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

	try {
		const [savedProvider] = await db
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
	} catch (error) {
		logger.error({
			msg: "Failed to insert non-OAuth provider",
			error,
			userId,
			type,
		});
		throw error;
	}
}

/**
 * Disconnect and remove a storage provider
 */
export async function disconnectProvider(
	db: Database,
	providerId: string,
	userId: string,
) {
	const [provider] = await db
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

	await db.delete(storageProviders).where(eq(storageProviders.id, providerId));
}

/**
 * Update provider quota values manually
 */
export async function updateProviderQuota(
	db: Database,
	providerId: string,
	userId: string,
	quotaTotal: number | null,
	quotaUsed: number,
) {
	const [providerRecord] = await db
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

	const [updated] = await db
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
