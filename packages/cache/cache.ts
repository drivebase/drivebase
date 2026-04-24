import type { Redis } from "ioredis";
import type { schema } from "@drivebase/db";

/**
 * Redis-backed cache for hot read paths (Phase 10).
 *
 * Keys:
 *   - `cache:provider:<providerId>:children:<parentRemoteId|root>`
 *   - `cache:provider:<providerId>:usage`
 *
 * Values are JSON with `Date` columns round-tripping as ISO strings; readers
 * rehydrate back to `Date` so callers see a shape identical to a fresh
 * Drizzle select. TTLs come from `config.cache` — we accept them at
 * construction time rather than reading config per call, so tests can pass
 * short TTLs without threading config through every layer.
 */
export type NodeRow = typeof schema.nodes.$inferSelect;
export type UsageRow = typeof schema.usage.$inferSelect;

type Ttls = {
  /** listChildren cache TTL in seconds. Plan default: 60. */
  children: number;
  /** provider usage cache TTL in seconds. Plan default: 600. */
  usage: number;
};

/** Fields on `nodes` / `usage` that must revive as `Date` after JSON parse. */
const NODE_DATE_FIELDS = [
  "syncedAt",
  "deletedAt",
  "remoteCreatedAt",
  "remoteUpdatedAt",
] as const;
const USAGE_DATE_FIELDS = ["lastSyncedAt"] as const;

/**
 * `parentRemoteId` is provider-defined — S3 uses slash-delimited prefixes,
 * Drive uses opaque ids. URL-encoding keeps the key safe and readable for
 * `redis-cli KEYS`. `null` → the synthetic `root` segment.
 */
function encodeParent(parentRemoteId: string | null): string {
  return parentRemoteId === null ? "root" : encodeURIComponent(parentRemoteId);
}

function childrenKey(providerId: string, parentRemoteId: string | null): string {
  return `cache:provider:${providerId}:children:${encodeParent(parentRemoteId)}`;
}

function usageKey(providerId: string): string {
  return `cache:provider:${providerId}:usage`;
}

function reviveDates<T extends Record<string, unknown>>(
  row: T,
  fields: readonly (keyof T)[],
): T {
  for (const f of fields) {
    const v = row[f];
    if (typeof v === "string") {
      row[f] = new Date(v) as T[keyof T];
    }
  }
  return row;
}

export class CacheService {
  constructor(
    private readonly redis: Redis,
    private readonly ttls: Ttls,
  ) {}

  async getChildren(
    providerId: string,
    parentRemoteId: string | null,
  ): Promise<NodeRow[] | null> {
    const raw = await this.redis.get(childrenKey(providerId, parentRemoteId));
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as NodeRow[];
    return parsed.map((r) => reviveDates(r, NODE_DATE_FIELDS));
  }

  async setChildren(
    providerId: string,
    parentRemoteId: string | null,
    rows: NodeRow[],
  ): Promise<void> {
    await this.redis.set(
      childrenKey(providerId, parentRemoteId),
      JSON.stringify(rows),
      "EX",
      this.ttls.children,
    );
  }

  async invalidateChildren(
    providerId: string,
    parentRemoteId: string | null,
  ): Promise<void> {
    await this.redis.del(childrenKey(providerId, parentRemoteId));
  }

  async getUsage(providerId: string): Promise<UsageRow | null> {
    const raw = await this.redis.get(usageKey(providerId));
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as UsageRow;
    return reviveDates(parsed, USAGE_DATE_FIELDS);
  }

  async setUsage(providerId: string, usage: UsageRow): Promise<void> {
    await this.redis.set(
      usageKey(providerId),
      JSON.stringify(usage),
      "EX",
      this.ttls.usage,
    );
  }

  async invalidateUsage(providerId: string): Promise<void> {
    await this.redis.del(usageKey(providerId));
  }

  /**
   * Nuke everything for a provider — used on disconnect so a later re-connect
   * with the same id (unlikely but possible) doesn't serve stale data, and to
   * keep memory tidy.
   */
  async invalidateProvider(providerId: string): Promise<void> {
    const pattern = `cache:provider:${providerId}:*`;
    // SCAN + DEL in batches; avoids KEYS' O(N) block on large databases.
    let cursor = "0";
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = next;
      if (keys.length > 0) await this.redis.del(...keys);
    } while (cursor !== "0");
  }
}
