import type { IStorageProvider } from "@drivebase/core";
import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { and, eq } from "drizzle-orm";
import {
	getProviderRegistration,
	getSensitiveFields,
} from "../../config/providers";
import { decryptConfig } from "../../utils/encryption";

export async function getProviders(db: Database, workspaceId: string) {
	return db
		.select()
		.from(storageProviders)
		.where(eq(storageProviders.workspaceId, workspaceId))
		.orderBy(storageProviders.createdAt);
}

export async function getProvider(
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

	return provider;
}

export async function getProviderInstance(
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
