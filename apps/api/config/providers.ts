import type { ProviderRegistration } from "@drivebase/core";
import { ProviderType } from "@drivebase/core";
import {
	DropboxSensitiveFields,
	dropboxRegistration,
} from "@drivebase/dropbox";
import { FTPSensitiveFields, ftpRegistration } from "@drivebase/ftp";
import { WebDAVSensitiveFields, webdavRegistration } from "@drivebase/webdav";
import {
	GoogleDriveSensitiveFields,
	googleDriveRegistration,
} from "@drivebase/google-drive";
import { LocalSensitiveFields, localRegistration } from "@drivebase/local";
import { S3SensitiveFields, s3Registration } from "@drivebase/s3";

/**
 * Storage provider registry
 * Maps provider types to their implementations
 */
export const providerRegistry: Record<string, ProviderRegistration> = {
	[ProviderType.GOOGLE_DRIVE]: googleDriveRegistration,
	[ProviderType.S3]: s3Registration,
	[ProviderType.LOCAL]: localRegistration,
	[ProviderType.DROPBOX]: dropboxRegistration,
	[ProviderType.FTP]: ftpRegistration,
	[ProviderType.WEBDAV]: webdavRegistration,
};

/**
 * Sensitive fields that should be encrypted for each provider
 */
export const providerSensitiveFields: Record<string, readonly string[]> = {
	[ProviderType.GOOGLE_DRIVE]: GoogleDriveSensitiveFields,
	[ProviderType.S3]: S3SensitiveFields,
	[ProviderType.LOCAL]: LocalSensitiveFields,
	[ProviderType.DROPBOX]: DropboxSensitiveFields,
	[ProviderType.FTP]: FTPSensitiveFields,
	[ProviderType.WEBDAV]: WebDAVSensitiveFields,
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
		case ProviderType.DROPBOX:
			return "Dropbox";
		case ProviderType.FTP:
			return "FTP";
		case ProviderType.WEBDAV:
			return "WebDAV";
		default:
			return type;
	}
}
