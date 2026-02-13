/**
 * @drivebase/webdav
 *
 * WebDAV storage provider for Drivebase
 */

export { WebDAVProvider } from "./provider";
export type { WebDAVConfig } from "./schema";
export {
	WebDAVConfigFields,
	WebDAVConfigSchema,
	WebDAVSensitiveFields,
} from "./schema";

import type { ProviderRegistration } from "@drivebase/core";
import { WebDAVProvider } from "./provider";
import { WebDAVConfigFields, WebDAVConfigSchema } from "./schema";

export const webdavRegistration: ProviderRegistration = {
	factory: () => new WebDAVProvider(),
	configSchema: WebDAVConfigSchema,
	configFields: WebDAVConfigFields,
	description: "WebDAV server storage (Nextcloud, ownCloud, etc.)",
	supportsPresignedUrls: false,
	authType: "api_key",
};
