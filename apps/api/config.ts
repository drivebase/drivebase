import { loadConfig, type AppConfig } from "@drivebase/config";

let cached: AppConfig | undefined;

/**
 * Load (and memoize) the process-wide AppConfig. Every other API module
 * goes through here so config is parsed exactly once.
 */
export async function getConfig(): Promise<AppConfig> {
  if (!cached) cached = await loadConfig();
  return cached;
}
