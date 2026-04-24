import { and, eq, isNull } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { QueryResolvers } from "~/graphql/__generated__/resolvers.ts";
import { notFound, requireUser } from "~/graphql/errors.ts";
import { instantiateProvider } from "~/services/providers.ts";
import { syncChildren } from "~/services/nodes.ts";

/**
 * 3-tier read for listing a folder's children:
 *
 *   1. Redis cache  — hot path, bounded by `config.cache.childrenTtlSeconds`.
 *   2. DB rows      — if any exist under this parent with `synced_at` within
 *      the TTL, trust them and re-populate Redis (a different API instance
 *      may have just warmed the DB).
 *   3. Provider     — live `listChildren`, upsert into `nodes`, set Redis.
 *
 * `force: true` skips tiers 1 + 2 and always re-lists from the provider.
 * Mutation workers call `cache.invalidateChildren(...)` to drop stale entries.
 */
export const listChildren: QueryResolvers["listChildren"] = async (
  _parent,
  { providerId, parentId, force },
  ctx,
) => {
  const user = requireUser(ctx);

  // Resolve the parent's remote id (null = provider root).
  let parentRemoteId: string | null = null;
  if (parentId) {
    const [p] = await ctx.db
      .select({ remoteId: schema.nodes.remoteId })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.id, parentId),
          eq(schema.nodes.providerId, providerId),
        ),
      )
      .limit(1);
    if (!p) throw notFound("parent node");
    parentRemoteId = p.remoteId;
  }

  // Tier 1 — Redis.
  if (!force) {
    const cached = await ctx.cache.getChildren(providerId, parentRemoteId);
    if (cached !== null) {
      return { nodes: cached, nextPageToken: null };
    }
  }

  // Tier 2 — DB with freshness. Any row under this parent older than the TTL
  // forces a re-list; we treat the set atomically so we never mix stale +
  // fresh rows in one response.
  if (!force) {
    const ttl = ctx.config.cache.childrenTtlSeconds;
    const rows = await ctx.db
      .select()
      .from(schema.nodes)
      .where(
        and(
          parentId
            ? eq(schema.nodes.parentId, parentId)
            : isNull(schema.nodes.parentId),
          eq(schema.nodes.providerId, providerId),
          isNull(schema.nodes.deletedAt),
        ),
      );
    const allFresh =
      rows.length > 0 &&
      rows.every(
        (r) =>
          r.syncedAt !== null &&
          Date.now() - r.syncedAt.getTime() < ttl * 1000,
      );
    if (allFresh) {
      await ctx.cache.setChildren(providerId, parentRemoteId, rows);
      return { nodes: rows, nextPageToken: null };
    }
  }

  // Tier 3 — live provider call + upsert.
  const { instance } = await instantiateProvider({
    db: ctx.db,
    config: ctx.config,
    registry: ctx.registry,
    userId: user.id,
    providerId,
  });

  const page = await instance.listChildren(parentRemoteId);
  const rows = await syncChildren({
    db: ctx.db,
    providerId,
    parentId: parentId ?? null,
    remoteChildren: page.nodes,
  });
  // Only cache when there's no pagination cursor — caching a partial page
  // would lie about the total under this parent.
  if (!page.nextPageToken) {
    await ctx.cache.setChildren(providerId, parentRemoteId, rows);
  }

  return { nodes: rows, nextPageToken: page.nextPageToken ?? null };
};
