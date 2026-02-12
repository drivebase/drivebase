/**
 * @drivebase/google-drive
 *
 * Google Drive storage provider for Drivebase
 */

export { GoogleDriveProvider } from "./provider";
export {
  GoogleDriveConfigSchema,
  GoogleDriveSensitiveFields,
  GoogleDriveConfigFields,
} from "./schema";
export type { GoogleDriveConfig } from "./schema";
export { initiateGoogleOAuth, handleGoogleOAuthCallback } from "./oauth";

import type { ProviderRegistration } from "@drivebase/core";
import { GoogleDriveProvider } from "./provider";
import { GoogleDriveConfigSchema, GoogleDriveConfigFields } from "./schema";
import { initiateGoogleOAuth, handleGoogleOAuthCallback } from "./oauth";

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
