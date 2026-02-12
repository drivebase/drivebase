/**
 * @drivebase/local
 *
 * Local filesystem provider for Drivebase
 */

export { LocalProvider } from "./provider";
export {
  LocalConfigSchema,
  LocalSensitiveFields,
  LocalConfigFields,
} from "./schema";
export type { LocalConfig } from "./schema";

import type { ProviderRegistration } from "@drivebase/core";
import { LocalProvider } from "./provider";
import { LocalConfigSchema, LocalConfigFields } from "./schema";

export const localRegistration: ProviderRegistration = {
  factory: () => new LocalProvider(),
  configSchema: LocalConfigSchema,
  configFields: LocalConfigFields,
  description: "Local filesystem storage",
  supportsPresignedUrls: false,
  authType: "no_auth",
};
