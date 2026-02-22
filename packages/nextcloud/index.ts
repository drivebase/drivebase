/**
 * @drivebase/nextcloud
 *
 * Nextcloud storage provider for Drivebase using Login Flow v2 and WebDAV
 */

export {
	handleNextcloudOAuthCallback,
	initiateNextcloudOAuth,
	pollNextcloudOAuth,
} from "./oauth";
export { NextcloudProvider } from "./provider";
export type { NextcloudConfig } from "./schema";
export {
	NextcloudConfigFields,
	NextcloudConfigSchema,
	NextcloudSensitiveFields,
} from "./schema";

import type { ProviderRegistration } from "@drivebase/core";
import {
	handleNextcloudOAuthCallback,
	initiateNextcloudOAuth,
	pollNextcloudOAuth,
} from "./oauth";
import { NextcloudProvider } from "./provider";
import { NextcloudConfigFields, NextcloudConfigSchema } from "./schema";

/**
 * Nextcloud provider registration
 */
export const nextcloudRegistration: ProviderRegistration = {
	factory: () => new NextcloudProvider(),
	configSchema: NextcloudConfigSchema,
	configFields: NextcloudConfigFields,
	description: "Nextcloud cloud storage with Login Flow v2",
	supportsPresignedUrls: false,
	authType: "oauth",
	initiateOAuth: initiateNextcloudOAuth,
	handleOAuthCallback: handleNextcloudOAuthCallback,
	pollOAuth: pollNextcloudOAuth,
};
