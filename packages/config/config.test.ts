import { describe, expect, test, afterEach } from "bun:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig, resetConfigCache } from "./index.ts";

const validKey = Buffer.alloc(32, 1).toString("base64");

async function withTempConfig(
  contents: string,
  fn: (path: string) => Promise<void>,
) {
  const dir = join(
    tmpdir(),
    `drivebase-config-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const file = join(dir, "config.toml");
  await Bun.write(file, contents);
  try {
    await fn(file);
  } finally {
    await Bun.$`rm -rf ${dir}`.quiet();
  }
}

afterEach(() => resetConfigCache());

describe("loadConfig", () => {
  test("parses a minimal valid config", async () => {
    await withTempConfig(
      `
[server]
env = "dev"
port = 4000

[db]
url = "postgres://u:p@localhost/db"

[redis]
url = "redis://localhost:6379/0"

[crypto]
masterKeyBase64 = "${validKey}"

[auth]
betterAuthSecret = "0123456789abcdef0123"
baseUrl = "http://localhost:4000"
`,
      async (file) => {
        const cfg = await loadConfig(file);
        expect(cfg.server.env).toBe("dev");
        expect(cfg.db.url).toContain("postgres://");
        expect(cfg.workers.concurrency.upload).toBe(4);
      },
    );
  });

  test("rejects a short master key", async () => {
    await withTempConfig(
      `
[server]
env = "dev"

[db]
url = "postgres://u:p@h/d"

[redis]
url = "redis://localhost"

[crypto]
masterKeyBase64 = "abc"

[auth]
betterAuthSecret = "0123456789abcdef"
baseUrl = "http://localhost:4000"
`,
      async (file) => {
        await expect(loadConfig(file)).rejects.toThrow(/masterKeyBase64/);
      },
    );
  });

  test("throws when file does not exist", async () => {
    await expect(loadConfig("/nonexistent/drivebase.toml")).rejects.toThrow(
      /config file not found/,
    );
  });
});
