import { NotFoundError, ProviderError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import {
	getProviderRegistration,
	getSensitiveFields,
} from "../../config/providers";
import { telemetry } from "../../telemetry";
import { encryptConfig } from "../../utils/encryption";
import { logger } from "../../utils/logger";
import { getOAuthCredentialConfig } from "./provider-credentials";

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
	workspaceId: string,
	userId: string,
	name: string,
	type: string,
	config: Record<string, unknown> | undefined,
	oauthCredentialId?: string,
) {
	const registration = getProviderRegistration(type);
	const sensitiveFields = getSensitiveFields(type);
	let resolvedConfig: Record<string, unknown>;

	if (registration.authType === "oauth" && oauthCredentialId) {
		resolvedConfig = await getOAuthCredentialConfig(
			db,
			oauthCredentialId,
			userId,
			type,
		);
	} else {
		if (!config) {
			throw new ValidationError("Provider configuration is required");
		}

		const schema = registration.configSchema as {
			safeParse: (v: unknown) => {
				success: boolean;
				error?: { errors: unknown[] };
				data?: Record<string, unknown>;
			};
		};
		const validation = schema.safeParse(config);

		if (!validation.success || !validation.data) {
			throw new ValidationError("Invalid provider configuration", {
				errors: validation.error?.errors,
			});
		}

		resolvedConfig = validation.data;
	}

	if (registration.authType === "oauth") {
		const encryptedConfig = encryptConfig(resolvedConfig, sensitiveFields);

		try {
			const [savedProvider] = await db
				.insert(storageProviders)
				.values({
					name,
					type: type as "google_drive" | "s3" | "local",
					authType: "oauth",
					encryptedConfig,
					workspaceId,
					isActive: false,
					quotaUsed: 0,
				})
				.returning();

			if (!savedProvider) {
				throw new Error("Failed to save provider");
			}

			telemetry.capture("provider_connected", { type });

			return savedProvider;
		} catch (error) {
			logger.error({
				msg: "Failed to insert OAuth provider",
				error,
				workspaceId,
				type,
			});
			throw error;
		}
	}

	// Non-OAuth providers: initialize, test connection, fetch quota
	const provider = registration.factory();
	await provider.initialize(resolvedConfig);

	const connected = await provider.testConnection();
	if (!connected) {
		throw new ProviderError(type, "Failed to connect to provider");
	}

	const quota = await provider.getQuota();
	await provider.cleanup();

	const encryptedConfig = encryptConfig(resolvedConfig, sensitiveFields);

	try {
		const [savedProvider] = await db
			.insert(storageProviders)
			.values({
				name,
				type: type as "google_drive" | "s3" | "local",
				authType: registration.authType,
				encryptedConfig,
				workspaceId,
				isActive: true,
				quotaTotal: quota.total ?? null,
				quotaUsed: quota.used,
				lastSyncAt: new Date(),
			})
			.returning();

		if (!savedProvider) {
			throw new Error("Failed to save provider");
		}

		telemetry.capture("provider_connected", { type });

		return savedProvider;
	} catch (error) {
		logger.error({
			msg: "Failed to insert non-OAuth provider",
			error,
			workspaceId,
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
	workspaceId: string,
) {
	const [provider] = await db
		.select()
		.from(storageProviders)
		.where(
			and(
				eq(storageProviders.id, providerId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!provider) {
		throw new NotFoundError("Provider");
	}

	await db.delete(storageProviders).where(eq(storageProviders.id, providerId));

	telemetry.capture("provider_disconnected", { type: provider.type });
}

/**
 * Update provider quota values manually
 */
export async function updateProviderQuota(
	db: Database,
	providerId: string,
	workspaceId: string,
	quotaTotal: number | null,
	quotaUsed: number,
) {
	const [providerRecord] = await db
		.select()
		.from(storageProviders)
		.where(
			and(
				eq(storageProviders.id, providerId),
				eq(storageProviders.workspaceId, workspaceId),
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
