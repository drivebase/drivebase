/**
 * @drivebase/s3
 *
 * S3-compatible storage provider for Drivebase
 */

export { S3Provider } from "./provider";
export {
  S3ConfigSchema,
  S3SensitiveFields,
  S3ConfigFields,
} from "./schema";
export type { S3Config } from "./schema";

import type { ProviderRegistration } from "@drivebase/core";
import { S3Provider } from "./provider";
import { S3ConfigSchema, S3ConfigFields } from "./schema";

export const s3Registration: ProviderRegistration = {
  factory: () => new S3Provider(),
  configSchema: S3ConfigSchema,
  configFields: S3ConfigFields,
  description: "S3-compatible object storage",
  supportsPresignedUrls: true,
  authType: "api_key",
};
