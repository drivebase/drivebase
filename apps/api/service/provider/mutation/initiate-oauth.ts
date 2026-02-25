import { ProviderError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { eq } from "drizzle-orm";
import {
	getProviderRegistration,
	getSensitiveFields,
} from "@/config/providers";
import { telemetry } from "@/telemetry";
import { decryptConfig, encryptConfig } from "@/utils/encryption";
import { getProvider } from "../query";
import {
	buildOAuthCallbackUrl,
	normalizeOAuthSource,
} from "../shared/oauth-helpers";

// Begin OAuth flow for an existing provider.
export async function initiateOAuth(
	db: Database,
	providerId: string,
	workspaceId: string,
	userId: string,
	source?: string,
) {
	const providerRecord = await getProvider(db, providerId, workspaceId);
	const registration = getProviderRegistration(providerRecord.type);

	if (registration.authType !== "oauth" || !registration.initiateOAuth) {
		throw new ProviderError(
			providerRecord.type,
			"This provider does not support OAuth",
		);
	}

	const sensitiveFields = getSensitiveFields(providerRecord.type);
	const config = decryptConfig(providerRecord.encryptedConfig, sensitiveFields);
	const state = `${providerId}:${crypto.randomUUID()}:${normalizeOAuthSource(source)}:${userId}`;
	const callbackUrl = buildOAuthCallbackUrl();
	const result = await registration.initiateOAuth(config, callbackUrl, state);

	if (result.configUpdates) {
		const updatedConfig = { ...config, ...result.configUpdates };
		const encryptedConfig = encryptConfig(updatedConfig, sensitiveFields);
		await db
			.update(storageProviders)
			.set({ encryptedConfig, updatedAt: new Date() })
			.where(eq(storageProviders.id, providerId));
	}

	telemetry.capture("provider_oauth_initiated", { type: providerRecord.type });
	return { authorizationUrl: result.authorizationUrl, state: result.state };
}
