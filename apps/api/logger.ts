import { createLogger, type Logger } from "@drivebase/logger";
import { getConfig } from "./config.ts";

let cached: Logger | undefined;

export async function getLogger(): Promise<Logger> {
  if (cached) return cached;
  const cfg = await getConfig();
  cached = createLogger({
    env: cfg.server.env,
    level: cfg.log.level,
    file: cfg.log.file,
    base: { app: "api" },
  });
  return cached;
}
