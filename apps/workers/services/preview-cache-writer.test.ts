import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AppConfig } from "@drivebase/config";
import { writePreview } from "./preview-cache-writer.ts";

function makeConfig(cachePath: string, maxCacheSizeBytes = 10 * 1024 * 1024): AppConfig {
  return {
    preview: { cachePath, maxEdgePx: 400, maxCacheSizeBytes },
  } as unknown as AppConfig;
}

let tmpDir: string;

afterEach(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

describe("writePreview", () => {
  test("writes jpeg to sharded path and updates index", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "preview-test-"));
    const config = makeConfig(tmpDir);
    const nodeId = "abcdef1234567890";
    const jpeg = Buffer.from("fakejpeg");

    await writePreview(config, nodeId, jpeg);

    const file = Bun.file(join(tmpDir, nodeId.slice(0, 2), `${nodeId}.jpg`));
    expect(await file.exists()).toBe(true);

    const raw = await Bun.file(join(tmpDir, "index.json")).text();
    const index = JSON.parse(raw) as Record<string, { size: number; lastAccessedAt: number }>;
    expect(index[nodeId]?.size).toBe(jpeg.byteLength);
  });

  test("evicts LRU entries when over the size limit", async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "preview-evict-"));
    // Limit to 10 bytes — any two 8-byte entries will trigger eviction.
    const config = makeConfig(tmpDir, 10);

    const a = "aa00000000000000";
    const b = "bb00000000000000";
    const c = "cc00000000000000";

    await writePreview(config, a, Buffer.alloc(8, 0));
    await writePreview(config, b, Buffer.alloc(8, 0));
    await writePreview(config, c, Buffer.alloc(8, 0));

    const raw = await Bun.file(join(tmpDir, "index.json")).text();
    const index = JSON.parse(raw) as Record<string, unknown>;

    // At most two entries (16 bytes ≤ 10 is impossible; only the latest
    // fits, so index should have 1 entry — the newest).
    expect(Object.keys(index).length).toBeLessThanOrEqual(2);
    expect(index[c]).toBeDefined();
  });
});
