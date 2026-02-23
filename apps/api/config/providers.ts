import type { ProviderRegistration } from "@drivebase/core";
import { ProviderType } from "@drivebase/core";
import {
	DarkiboxSensitiveFields,
	darkiboxRegistration,
} from "@drivebase/darkibox";
import {
	DropboxSensitiveFields,
	dropboxRegistration,
} from "@drivebase/dropbox";
import { FTPSensitiveFields, ftpRegistration } from "@drivebase/ftp";
import {
	GoogleDriveSensitiveFields,
	googleDriveRegistration,
} from "@drivebase/google-drive";
import { LocalSensitiveFields, localRegistration } from "@drivebase/local";
import {
	NextcloudSensitiveFields,
	nextcloudRegistration,
} from "@drivebase/nextcloud";
import { S3SensitiveFields, s3Registration } from "@drivebase/s3";
import {
	TelegramSensitiveFields,
	telegramRegistration,
} from "@drivebase/telegram";
import { WebDAVSensitiveFields, webdavRegistration } from "@drivebase/webdav";
import type { Hono } from "hono";
import type { AppEnv } from "../server/app";
import { logger } from "../utils/logger";

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
	[ProviderType.TELEGRAM]: telegramRegistration,
	[ProviderType.NEXTCLOUD]: nextcloudRegistration,
	[ProviderType.DARKIBOX]: darkiboxRegistration,
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
	[ProviderType.TELEGRAM]: TelegramSensitiveFields,
	[ProviderType.NEXTCLOUD]: NextcloudSensitiveFields,
	[ProviderType.DARKIBOX]: DarkiboxSensitiveFields,
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
		usesPollingAuth: !!reg.pollOAuth,
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
		case ProviderType.TELEGRAM:
			return "Telegram";
		case ProviderType.NEXTCLOUD:
			return "Nextcloud";
		case ProviderType.DARKIBOX:
			return "Darkibox";
		default:
			return type;
	}
}

/**
 * Mount provider plugin routes to Hono app
 * Each provider can optionally provide REST routes that are mounted with auth middleware
 */
export function mountPluginRoutes(app: Hono<AppEnv>): void {
	const { authMiddleware } = require("../server/middleware/auth");

	for (const [type, registration] of Object.entries(providerRegistry)) {
		if (registration.routes) {
			const prefix = registration.routePrefix || `/api/providers/${type}`;

			// Apply auth middleware to all plugin routes
			app.use(`${prefix}/*`, authMiddleware);

			// Mount the plugin's Hono sub-app
			app.route(prefix, registration.routes as Hono);

			logger.debug(`Routes mounted at ${prefix}`);
		}
	}
}
