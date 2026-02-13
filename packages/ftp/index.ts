/**
 * @drivebase/ftp
 *
 * FTP/FTPS storage provider for Drivebase
 */

export { FTPProvider } from "./provider";
export type { FTPConfig } from "./schema";
export {
	FTPConfigFields,
	FTPConfigSchema,
	FTPSensitiveFields,
} from "./schema";

import type { ProviderRegistration } from "@drivebase/core";
import { FTPProvider } from "./provider";
import { FTPConfigFields, FTPConfigSchema } from "./schema";

export const ftpRegistration: ProviderRegistration = {
	factory: () => new FTPProvider(),
	configSchema: FTPConfigSchema,
	configFields: FTPConfigFields,
	description: "FTP/FTPS file server storage",
	supportsPresignedUrls: false,
	authType: "email_pass",
};
