import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import type { Redis } from "ioredis";
import { startRedis, type RedisHarness } from "@drivebase/testing";
import { CacheService, type NodeRow, type UsageRow } from "./index.ts";

/**
 * CacheService is thin, but the JSON round-trip (Date revival, null-as-root
 * parent encoding, URL-encoded parent ids) is the bit most likely to rot.
 * We exercise it against a real Redis so the ioredis command signatures
 * (SET ... EX, SCAN cursor protocol) don't drift.
 */

let harness: RedisHarness;
let redis: Redis;
let cache: CacheService;

function nodeRow(remoteId: string): NodeRow {
  const now = new Date("2026-04-19T12:00:00.000Z");
  return {
    id: `node-${remoteId}`,
    providerId: "prov-1",
    remoteId,
    parentId: null,
    name: remoteId,
    type: "file",
    pathText: `/${remoteId}`,
    size: 100,
    mimeType: "text/plain",
    checksum: null,
    remoteCreatedAt: now,
    remoteUpdatedAt: now,
    syncedAt: now,
    deletedAt: null,
  };
}

function usageRow(): UsageRow {
  return {
    id: "u1",
    providerId: "prov-1",
    total: 1_000_000,
    used: 500,
    available: 999_500,
    lastSyncedAt: new Date("2026-04-19T12:00:00.000Z"),
  };
}

beforeAll(async () => {
  harness = await startRedis();
  redis = harness.client;
  cache = new CacheService(redis, { children: 60, usage: 600 });
});

afterAll(async () => {
  await harness.stop();
});

beforeEach(async () => {
  await redis.flushall();
});

describe("CacheService.children", () => {
  test("miss returns null", async () => {
    expect(await cache.getChildren("prov-1", null)).toBeNull();
  });

  test("round-trips rows and revives Date columns", async () => {
    const rows = [nodeRow("a"), nodeRow("b")];
    await cache.setChildren("prov-1", null, rows);
    const got = await cache.getChildren("prov-1", null);
    expect(got).not.toBeNull();
    if (got === null) return;
    expect(got).toHaveLength(2);
    const first = got[0];
    if (!first) throw new Error("expected first row");
    expect(first.remoteId).toBe("a");
    // Date fields survive JSON round-trip as Date, not string — the read-path
    // downstream code does arithmetic on syncedAt.
    expect(first.syncedAt).toBeInstanceOf(Date);
    expect(first.syncedAt.toISOString()).toBe("2026-04-19T12:00:00.000Z");
    expect(first.remoteCreatedAt).toBeInstanceOf(Date);
  });

  test("null parent is distinct from real parentRemoteId", async () => {
    await cache.setChildren("prov-1", null, [nodeRow("root-a")]);
    await cache.setChildren("prov-1", "folder-1", [nodeRow("child-a")]);
    const root = await cache.getChildren("prov-1", null);
    const folder = await cache.getChildren("prov-1", "folder-1");
    expect(root?.[0]?.remoteId).toBe("root-a");
    expect(folder?.[0]?.remoteId).toBe("child-a");
  });

  test("encodes parent remoteId safely (slashes, spaces)", async () => {
    const weird = "folder/with spaces/and?questions";
    await cache.setChildren("prov-1", weird, [nodeRow("x")]);
    const got = await cache.getChildren("prov-1", weird);
    expect(got?.[0]?.remoteId).toBe("x");
  });

  test("TTL is applied", async () => {
    const shortLived = new CacheService(redis, { children: 1, usage: 600 });
    await shortLived.setChildren("prov-ttl", null, [nodeRow("x")]);
    const ttl = await redis.ttl("cache:provider:prov-ttl:children:root");
    // Between 0 and 1 inclusive — Redis may have ticked by the time we read.
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(1);
  });

  test("invalidateChildren removes only the target parent's entry", async () => {
    await cache.setChildren("prov-1", null, [nodeRow("a")]);
    await cache.setChildren("prov-1", "folder-1", [nodeRow("b")]);
    await cache.invalidateChildren("prov-1", null);
    expect(await cache.getChildren("prov-1", null)).toBeNull();
    expect(await cache.getChildren("prov-1", "folder-1")).not.toBeNull();
  });
});

describe("CacheService.usage", () => {
  test("round-trips and revives lastSyncedAt", async () => {
    await cache.setUsage("prov-1", usageRow());
    const got = await cache.getUsage("prov-1");
    expect(got).not.toBeNull();
    if (got === null) return;
    expect(got.used).toBe(500);
    expect(got.lastSyncedAt).toBeInstanceOf(Date);
    expect(got.lastSyncedAt.toISOString()).toBe("2026-04-19T12:00:00.000Z");
  });

  test("invalidateUsage removes entry", async () => {
    await cache.setUsage("prov-1", usageRow());
    await cache.invalidateUsage("prov-1");
    expect(await cache.getUsage("prov-1")).toBeNull();
  });
});

describe("CacheService.invalidateProvider", () => {
  test("nukes all keys for the provider but leaves others alone", async () => {
    await cache.setChildren("prov-1", null, [nodeRow("a")]);
    await cache.setChildren("prov-1", "folder-1", [nodeRow("b")]);
    await cache.setUsage("prov-1", usageRow());
    await cache.setChildren("prov-2", null, [nodeRow("c")]);

    await cache.invalidateProvider("prov-1");

    expect(await cache.getChildren("prov-1", null)).toBeNull();
    expect(await cache.getChildren("prov-1", "folder-1")).toBeNull();
    expect(await cache.getUsage("prov-1")).toBeNull();
    // Other provider's keys survive.
    expect(await cache.getChildren("prov-2", null)).not.toBeNull();
  });
});
