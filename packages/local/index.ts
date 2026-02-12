/**
 * @drivebase/local
 *
 * Local filesystem provider for Drivebase
 */

export { LocalProvider } from "./provider";
export type { LocalConfig } from "./schema";
export {
	LocalConfigFields,
	LocalConfigSchema,
	LocalSensitiveFields,
} from "./schema";

import type { ProviderRegistration } from "@drivebase/core";
import { LocalProvider } from "./provider";
import { LocalConfigFields, LocalConfigSchema } from "./schema";

export const localRegistration: ProviderRegistration = {
	factory: () => new LocalProvider(),
	configSchema: LocalConfigSchema,
	configFields: LocalConfigFields,
	description: "Local filesystem storage",
	supportsPresignedUrls: false,
	authType: "no_auth",
};
