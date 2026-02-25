import { ProviderError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import {
	getProviderRegistration,
	getSensitiveFields,
} from "@/config/providers";
import { telemetry } from "@/telemetry";
import { encryptConfig } from "@/utils/encryption";
import { logger } from "@/utils/logger";
import { getOAuthCredentialConfig } from "../query";

// Connect a provider and persist encrypted configuration.
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
			if (!savedProvider) throw new Error("Failed to save provider");
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

	const provider = registration.factory();
	await provider.initialize(resolvedConfig);
	const connected = await provider.testConnection();
	if (!connected)
		throw new ProviderError(type, "Failed to connect to provider");
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
		if (!savedProvider) throw new Error("Failed to save provider");
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
