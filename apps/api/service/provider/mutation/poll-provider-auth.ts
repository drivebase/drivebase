import { ProviderError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { eq } from "drizzle-orm";
import {
	getProviderRegistration,
	getSensitiveFields,
} from "@/config/providers";
import { decryptConfig, encryptConfig } from "@/utils/encryption";
import { getProvider } from "../query";
import { scheduleInitialProviderSync } from "./schedule-initial-provider-sync";

// Poll OAuth completion for non-redirect providers and activate on success.
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
	if (!updatedConfig) return { status: "pending" };

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
		throw new Error("Failed to update provider after poll-based auth");

	await scheduleInitialProviderSync({
		db,
		providerId: updated.id,
		workspaceId,
		userId,
		context: "pollProviderAuth",
	});

	return { status: "success", provider: updated };
}
