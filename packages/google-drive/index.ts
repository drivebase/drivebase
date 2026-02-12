/**
 * @drivebase/google-drive
 *
 * Google Drive storage provider for Drivebase
 */

export { handleGoogleOAuthCallback, initiateGoogleOAuth } from "./oauth";
export { GoogleDriveProvider } from "./provider";
export type { GoogleDriveConfig } from "./schema";
export {
	GoogleDriveConfigFields,
	GoogleDriveConfigSchema,
	GoogleDriveSensitiveFields,
} from "./schema";

import type { ProviderRegistration } from "@drivebase/core";
import { handleGoogleOAuthCallback, initiateGoogleOAuth } from "./oauth";
import { GoogleDriveProvider } from "./provider";
import { GoogleDriveConfigFields, GoogleDriveConfigSchema } from "./schema";

/**
 * Google Drive provider registration
 */
export const googleDriveRegistration: ProviderRegistration = {
	factory: () => new GoogleDriveProvider(),
	configSchema: GoogleDriveConfigSchema,
	configFields: GoogleDriveConfigFields,
	description: "Google Drive cloud storage with OAuth 2.0",
	supportsPresignedUrls: true,
	authType: "oauth",
	initiateOAuth: initiateGoogleOAuth,
	handleOAuthCallback: handleGoogleOAuthCallback,
};
