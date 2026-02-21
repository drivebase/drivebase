import { NotFoundError, ProviderError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { eq } from "drizzle-orm";
import {
	getProviderRegistration,
	getSensitiveFields,
} from "../../config/providers";
import { getPublicApiBaseUrl } from "../../config/url";
import { decryptConfig, encryptConfig } from "../../utils/encryption";
import { getProvider } from "./provider-queries";

type OAuthInitiatorSource = "default" | "onboarding";

function normalizeOAuthSource(source?: string): OAuthInitiatorSource {
	if (source === "onboarding") {
		return "onboarding";
	}
	return "default";
}

function parseOAuthState(state: string): {
	providerId: string;
	source: OAuthInitiatorSource;
} {
	const [providerId, _csrfToken, source] = state.split(":");
	if (!providerId) {
		throw new ValidationError("Invalid OAuth state parameter");
	}

	return {
		providerId,
		source: normalizeOAuthSource(source),
	};
}

function buildCallbackUrl(): string {
	const baseUrl = getPublicApiBaseUrl();
	return `${baseUrl}/webhook/callback`;
}

/**
 * Initiate an OAuth flow for an existing provider record.
 * Returns the authorization URL and state token to send to the frontend.
 */
export async function initiateOAuth(
	db: Database,
	providerId: string,
	workspaceId: string,
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

	// Encode provider ID + random CSRF token into state
	const state = `${providerId}:${crypto.randomUUID()}:${normalizeOAuthSource(source)}`;
	const callbackUrl = buildCallbackUrl();
	return registration.initiateOAuth(config, callbackUrl, state);
}

/**
 * Handle the OAuth callback for a provider.
 * Called by the GET /webhook/callback HTTP route — NOT authenticated via GraphQL.
 * The provider ID is extracted from the state parameter (format: "<providerId>:<csrfToken>").
 * Exchanges the code for tokens, updates the stored config, and activates the provider.
 */
export async function handleOAuthCallback(
	db: Database,
	code: string,
	state: string,
) {
	const { providerId, source } = parseOAuthState(state);

	const [providerRecord] = await db
		.select()
		.from(storageProviders)
		.where(eq(storageProviders.id, providerId))
		.limit(1);

	if (!providerRecord) {
		throw new NotFoundError("Provider");
	}

	const registration = getProviderRegistration(providerRecord.type);

	if (registration.authType !== "oauth" || !registration.handleOAuthCallback) {
		throw new ProviderError(
			providerRecord.type,
			"This provider does not support OAuth",
		);
	}

	const sensitiveFields = getSensitiveFields(providerRecord.type);
	const config = decryptConfig(providerRecord.encryptedConfig, sensitiveFields);

	const callbackUrl = buildCallbackUrl();
	const updatedConfig = await registration.handleOAuthCallback(
		config,
		code,
		callbackUrl,
	);

	// Initialize provider with the new tokens to find or create the root folder
	const provider = registration.factory();
	await provider.initialize(updatedConfig);

	let rootFolderId: string;
	const existingFolderId = await provider.findFolder?.("Drivebase");

	if (existingFolderId) {
		rootFolderId = existingFolderId;
	} else {
		rootFolderId = await provider.createFolder({
			name: "Drivebase",
		});
	}

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

	const [updated] = await db
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

	return {
		provider: updated,
		source,
	};
}
