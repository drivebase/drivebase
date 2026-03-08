/**
 * @drivebase/samba
 *
 * Samba (SMB2) storage provider for Drivebase
 */

export { SambaProvider } from "./provider";
export type { SambaConfig } from "./schema";
export {
	SambaConfigFields,
	SambaConfigSchema,
	SambaSensitiveFields,
} from "./schema";

import type { ProviderRegistration } from "@drivebase/core";
import { SambaProvider } from "./provider";
import { SambaConfigFields, SambaConfigSchema } from "./schema";

export const sambaRegistration: ProviderRegistration = {
	factory: () => new SambaProvider(),
	configSchema: SambaConfigSchema,
	configFields: SambaConfigFields,
	description: "Samba (SMB2) network file share",
	supportsPresignedUrls: false,
	authType: "email_pass",
};
