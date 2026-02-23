import { NotFoundError, ProviderError, ValidationError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders, workspaceMemberships } from "@drivebase/db";
import { eq } from "drizzle-orm";
import { enqueueSyncJob } from "../../queue/sync-queue";
import {
	getProviderRegistration,
	getSensitiveFields,
} from "../../config/providers";
import { getPublicApiBaseUrl } from "../../config/url";
import { telemetry } from "../../telemetry";
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
	const result = await registration.initiateOAuth(config, callbackUrl, state);

	// If the provider returned config updates (e.g. poll tokens for Login Flow),
	// persist them into the provider's encrypted config immediately.
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

/**
 * Poll-based OAuth authentication for providers that don't redirect back.
 * The provider's pollOAuth() is called with the stored config.
 * If it returns non-null, the provider is activated (root folder created, quota fetched).
 *
 * Returns { status: "pending" } if the user hasn't authenticated yet,
 * or the activated provider record on success.
 */
export async function pollProviderAuth(
	db: Database,
	providerId: string,
	workspaceId: string,
	userId: string,
): Promise<
	| { status: "pending"; provider?: undefined }
	| { status: "success"; provider: typeof storageProviders.$inferSelect }
> {
	const providerRecord = await getProvider(db, providerId, workspaceId);

	const registration = getProviderRegistration(providerRecord.type);

	if (!registration.pollOAuth) {
		throw new ProviderError(
			providerRecord.type,
			"This provider does not support poll-based authentication",
		);
	}

	const sensitiveFields = getSensitiveFields(providerRecord.type);
	const config = decryptConfig(providerRecord.encryptedConfig, sensitiveFields);

	const updatedConfig = await registration.pollOAuth(config);

	if (!updatedConfig) {
		return { status: "pending" };
	}

	// Credentials received — activate the provider (same logic as handleOAuthCallback)
	const provider = registration.factory();
	await provider.initialize(updatedConfig);

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

	const encryptedConfig = encryptConfig(updatedConfig, sensitiveFields);

	const [updated] = await db
		.update(storageProviders)
		.set({
			encryptedConfig,
			isActive: true,
			accountEmail,
			accountName,
			quotaTotal: quota.total ?? null,
			quotaUsed: quota.used,
			lastSyncAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(storageProviders.id, providerId))
		.returning();

	if (!updated) {
		throw new Error("Failed to update provider after poll-based auth");
	}

	// Auto-sync provider files in the background
	await enqueueSyncJob({
		providerId,
		workspaceId: providerRecord.workspaceId,
		userId,
	});

	return { status: "success", provider: updated };
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

	// Initialize provider with the new tokens to fetch account info and quota
	const provider = registration.factory();
	await provider.initialize(updatedConfig);

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

	// Auto-sync provider files in the background
	// Look up a workspace member to use as the sync userId
	const [member] = await db
		.select()
		.from(workspaceMemberships)
		.where(eq(workspaceMemberships.workspaceId, providerRecord.workspaceId))
		.limit(1);

	if (member) {
		await enqueueSyncJob({
			providerId,
			workspaceId: providerRecord.workspaceId,
			userId: member.userId,
		});
	}

	return {
		provider: updated,
		source,
	};
}
