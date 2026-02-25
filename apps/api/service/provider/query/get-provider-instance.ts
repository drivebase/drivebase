import type { IStorageProvider } from "@drivebase/core";
import {
	getProviderRegistration,
	getSensitiveFields,
} from "@/config/providers";
import { decryptConfig } from "@/utils/encryption";

// Build and initialize provider instance from stored config.
export async function getProviderInstance(providerRecord: {
	type: string;
	encryptedConfig: string;
}): Promise<IStorageProvider> {
	const registration = getProviderRegistration(providerRecord.type);
	const provider = registration.factory();
	const sensitiveFields = getSensitiveFields(providerRecord.type);
	const config = decryptConfig(providerRecord.encryptedConfig, sensitiveFields);
	await provider.initialize(config);
	return provider;
}
