export { DarkiboxProvider } from "./provider";
export type { DarkiboxConfig } from "./schema";
export {
	DarkiboxConfigFields,
	DarkiboxConfigSchema,
	DarkiboxSensitiveFields,
} from "./schema";

import type { ProviderRegistration } from "@drivebase/core";
import { DarkiboxProvider } from "./provider";
import { DarkiboxConfigFields, DarkiboxConfigSchema } from "./schema";

export const darkiboxRegistration: ProviderRegistration = {
	factory: () => new DarkiboxProvider(),
	configSchema: DarkiboxConfigSchema,
	configFields: DarkiboxConfigFields,
	description:
		"Connect your Darkibox account to store and stream files via the Darkibox cloud.",
	supportsPresignedUrls: false,
	authType: "api_key",
};
