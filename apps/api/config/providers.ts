import type { ProviderRegistration } from "@drivebase/core";
import { ProviderType } from "@drivebase/core";
import {
	GoogleDriveSensitiveFields,
	googleDriveRegistration,
} from "@drivebase/google-drive";
import { S3SensitiveFields, s3Registration } from "@drivebase/s3";
import { LocalSensitiveFields, localRegistration } from "@drivebase/local";

/**
 * Storage provider registry
 * Maps provider types to their implementations
 */
export const providerRegistry: Record<string, ProviderRegistration> = {
	[ProviderType.GOOGLE_DRIVE]: googleDriveRegistration,
	[ProviderType.S3]: s3Registration,
	[ProviderType.LOCAL]: localRegistration,
};

/**
 * Sensitive fields that should be encrypted for each provider
 */
export const providerSensitiveFields: Record<string, readonly string[]> = {
	[ProviderType.GOOGLE_DRIVE]: GoogleDriveSensitiveFields,
	[ProviderType.S3]: S3SensitiveFields,
	[ProviderType.LOCAL]: LocalSensitiveFields,
};

/**
 * Get provider registration by type
 */
export function getProviderRegistration(type: string): ProviderRegistration {
	const registration = providerRegistry[type];
	if (!registration) {
		throw new Error(`Unknown provider type: ${type}`);
	}
	return registration;
}

/**
 * Get sensitive fields for a provider type
 */
export function getSensitiveFields(type: string): readonly string[] {
	return providerSensitiveFields[type] || [];
}

/**
 * Get list of available provider types with their configuration schema
 */
export function getAvailableProviders() {
	return Object.entries(providerRegistry).map(([id, reg]) => ({
		id,
		name: getProviderName(id),
		description: reg.description,
		authType: reg.authType,
		configFields: reg.configFields,
	}));
}

function getProviderName(type: string): string {
	switch (type) {
		case ProviderType.GOOGLE_DRIVE:
			return "Google Drive";
		case ProviderType.S3:
			return "S3 Compatible";
		case ProviderType.LOCAL:
			return "Local Storage";
		default:
			return type;
	}
}
