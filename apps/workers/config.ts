import { loadConfig, type AppConfig } from "@drivebase/config";

let cached: AppConfig | undefined;

/** Memoize the parsed config for the worker process. */
export async function getConfig(): Promise<AppConfig> {
  if (!cached) cached = await loadConfig();
  return cached;
}
