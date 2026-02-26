import { NotFoundError, ProviderError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders, workspaces } from "@drivebase/db";
import { eq } from "drizzle-orm";
import {
	getProviderRegistration,
	getSensitiveFields,
} from "@/config/providers";
import { decryptConfig, encryptConfig } from "@/utils/encryption";
import {
	buildOAuthCallbackUrl,
	parseOAuthState,
} from "../shared/oauth-helpers";
import { scheduleInitialProviderSync } from "./schedule-initial-provider-sync";

// Handle OAuth callback, persist tokens, and activate provider.
export async function handleOAuthCallback(
	db: Database,
	code: string,
	state: string,
): Promise<{
	provider: typeof storageProviders.$inferSelect;
	source: string;
	actorUserId?: string;
}> {
	const { providerId, source, userId: stateUserId } = parseOAuthState(state);

	const [providerRecord] = await db
		.select()
		.from(storageProviders)
		.where(eq(storageProviders.id, providerId))
		.limit(1);
	if (!providerRecord) throw new NotFoundError("Provider");

	const registration = getProviderRegistration(providerRecord.type);
	if (registration.authType !== "oauth" || !registration.handleOAuthCallback) {
		throw new ProviderError(
			providerRecord.type,
			"This provider does not support OAuth",
		);
	}

	const sensitiveFields = getSensitiveFields(providerRecord.type);
	const config = decryptConfig(providerRecord.encryptedConfig, sensitiveFields);
	const updatedConfig = await registration.handleOAuthCallback(
		config,
		code,
		buildOAuthCallbackUrl(),
	);

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
	if (!updated)
		throw new Error("Failed to update provider after OAuth callback");

	let syncUserId = stateUserId;
	if (!syncUserId) {
		const [workspace] = await db
			.select({ ownerId: workspaces.ownerId })
			.from(workspaces)
			.where(eq(workspaces.id, updated.workspaceId))
			.limit(1);
		syncUserId = workspace?.ownerId;
	}

	if (syncUserId) {
		await scheduleInitialProviderSync({
			db,
			providerId: updated.id,
			workspaceId: updated.workspaceId,
			userId: syncUserId,
			context: "handleOAuthCallback",
		});
	}

	return { provider: updated, source, actorUserId: syncUserId ?? undefined };
}
