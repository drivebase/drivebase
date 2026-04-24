import { and, eq, isNull } from "drizzle-orm";
import { schema } from "@drivebase/db";
import { parentPath, type PlanEntry } from "@drivebase/storage";
import type { WorkerDeps } from "./deps.ts";

/**
 * Invalidate cached reads for every provider/parent touched by an entry.
 *
 * `listChildren` has two cache tiers:
 *   1. Redis children cache
 *   2. "fresh enough" DB rows under a parent (`synced_at` within TTL)
 *
 * Clearing Redis alone is not sufficient after mutations that add/move nodes:
 * tier 2 can still serve a stale sibling set for up to `childrenTtlSeconds`.
 *
 * So after a successful worker mutation we:
 *   - clear the provider's Redis cache namespace
 *   - mark the touched parent listings stale in the DB by backdating the
 *     children's `synced_at`
 *
 * The next `listChildren` for those parents will re-list the provider and
 * upsert the authoritative rows immediately.
 */
export async function invalidateEntryCache(
  deps: WorkerDeps,
  entry: PlanEntry,
): Promise<void> {
  await invalidateDbFreshness(deps, entry).catch((err) => {
    deps.log.warn({ err, entryKind: entry.kind }, "db freshness invalidation failed; TTL will expire it");
  });

  const providers = new Set<string>();
  if (entry.src) providers.add(entry.src.providerId);
  providers.add(entry.dst.providerId);

  for (const providerId of providers) {
    await deps.cache.invalidateProvider(providerId).catch((err) => {
      deps.log.warn({ err, providerId }, "cache invalidation failed; TTL will expire it");
    });
  }
}

async function invalidateDbFreshness(
  deps: WorkerDeps,
  entry: PlanEntry,
): Promise<void> {
  const parents = new Map<string, { providerId: string; parentId: string | null }>();

  const addParent = (providerId: string, parentId: string | null) => {
    const key = `${providerId}:${parentId ?? "root"}`;
    parents.set(key, { providerId, parentId });
  };

  const dstParentPath = parentPath(entry.dst.path);
  const dstParentId = entry.dst.parentRemoteId != null
    ? await resolveParentId(
        deps,
        entry.dst.providerId,
        entry.dst.parentRemoteId,
      )
    : dstParentPath === "/"
      ? null
      : await resolveParentIdByPath(deps, entry.dst.providerId, dstParentPath);
  addParent(entry.dst.providerId, dstParentId);

  if (
    entry.src?.remoteId &&
    (entry.kind === "delete" || entry.kind === "move")
  ) {
    const srcParentId = await resolveSourceParentId(
      deps,
      entry.src.providerId,
      entry.src.remoteId,
    );
    addParent(entry.src.providerId, srcParentId);
  }

  for (const { providerId, parentId } of parents.values()) {
    await deps.db
      .update(schema.nodes)
      .set({ syncedAt: new Date(0) })
      .where(
        and(
          eq(schema.nodes.providerId, providerId),
          parentId === null
            ? isNull(schema.nodes.parentId)
            : eq(schema.nodes.parentId, parentId),
          isNull(schema.nodes.deletedAt),
        ),
      );
  }
}

async function resolveParentId(
  deps: WorkerDeps,
  providerId: string,
  parentRemoteId: string | null,
): Promise<string | null> {
  if (parentRemoteId === null) return null;
  const [row] = await deps.db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.providerId, providerId),
        eq(schema.nodes.remoteId, parentRemoteId),
        isNull(schema.nodes.deletedAt),
      ),
    )
    .limit(1);
  return row?.id ?? null;
}

async function resolveParentIdByPath(
  deps: WorkerDeps,
  providerId: string,
  pathText: string,
): Promise<string | null> {
  const [row] = await deps.db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.providerId, providerId),
        eq(schema.nodes.pathText, pathText),
        isNull(schema.nodes.deletedAt),
      ),
    )
    .limit(1);
  return row?.id ?? null;
}

async function resolveSourceParentId(
  deps: WorkerDeps,
  providerId: string,
  remoteId: string,
): Promise<string | null> {
  const [row] = await deps.db
    .select({ parentId: schema.nodes.parentId })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.providerId, providerId),
        eq(schema.nodes.remoteId, remoteId),
      ),
    )
    .limit(1);
  return row?.parentId ?? null;
}
