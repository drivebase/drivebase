/**
 * @drivebase/dropbox
 *
 * Dropbox storage provider for Drivebase
 */

export { handleDropboxOAuthCallback, initiateDropboxOAuth } from "./oauth";
export { DropboxProvider } from "./provider";
export type { DropboxConfig } from "./schema";
export {
	DropboxConfigFields,
	DropboxConfigSchema,
	DropboxSensitiveFields,
} from "./schema";

import type { ProviderRegistration } from "@drivebase/core";
import { handleDropboxOAuthCallback, initiateDropboxOAuth } from "./oauth";
import { DropboxProvider } from "./provider";
import { DropboxConfigFields, DropboxConfigSchema } from "./schema";

/**
 * Dropbox provider registration
 */
export const dropboxRegistration: ProviderRegistration = {
	factory: () => new DropboxProvider(),
	configSchema: DropboxConfigSchema,
	configFields: DropboxConfigFields,
	description: "Dropbox cloud storage with OAuth 2.0",
	supportsPresignedUrls: false,
	authType: "oauth",
	initiateOAuth: initiateDropboxOAuth,
	handleOAuthCallback: handleDropboxOAuthCallback,
};
