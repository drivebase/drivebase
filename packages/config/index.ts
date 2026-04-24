import { resolve } from "node:path";
import { parse as parseToml } from "smol-toml";
import { AppConfigSchema, type AppConfig } from "./schema.ts";

export type { AppConfig, QueueName } from "./schema.ts";
export { AppConfigSchema } from "./schema.ts";

let cached: AppConfig | undefined;

export async function loadConfig(path?: string): Promise<AppConfig> {
  if (cached) return cached;
  const p = resolve(
    path ?? Bun.env.DRIVEBASE_CONFIG ?? "./config.toml",
  );
  const file = Bun.file(p);
  if (!(await file.exists())) {
    throw new Error(
      `config file not found at ${p}. Set DRIVEBASE_CONFIG or create config.toml.`,
    );
  }
  const raw = await file.text();
  const parsed = parseToml(raw);
  const result = AppConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`invalid config at ${p}:\n${issues}`);
  }
  cached = result.data;
  return cached;
}

export function resetConfigCache() {
  cached = undefined;
}
