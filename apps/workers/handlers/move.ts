import { and, eq, like, sql } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { Db } from "@drivebase/db";
import { meterStream } from "@drivebase/storage";
import type { Handler } from "../runtime/handler.ts";
import { getProvider } from "../runtime/providers.ts";
import { invalidateEntryCache } from "../runtime/invalidate.ts";
import {
  checkDestinationExists,
  resolveConflictDecision,
  autoRename,
  fetchSiblingNames,
} from "../runtime/conflict.ts";

/**
 * Same-provider move. Prefer native server-side move (Drive's `files.update`
 * with `addParents`/`removeParents`). For S3 (no native move), fall back to
 * copy-then-delete: we first CopyObject to the new key, then delete the old.
 *
 * After the provider move succeeds we update the node row in the DB so
 * tier-2 (DB freshness) doesn't serve stale parentId / pathText.
 * For folder moves we also rewrite all descendant paths (LIKE '/old/%').
 */
export const handleMove: Handler = async (ctx) => {
  const { entry, deps, reportProgress, jobId, operationId, conflictDecision } = ctx;
  if (!entry.src?.remoteId) {
    throw new Error("move entry missing src.remoteId");
  }
  const provider = await getProvider({
    db: deps.db,
    config: deps.config,
    registry: deps.registry,
    providerId: entry.src.providerId,
  });

  // Check live against the provider — entry.dst.parentRemoteId is already resolved.
  const existing = await checkDestinationExists(provider, entry.dst.parentRemoteId ?? null, entry.dst.name);
  let dstName = entry.dst.name;
  let dstPath = entry.dst.path;

  if (existing) {
    const decision = await resolveConflictDecision({
      deps,
      jobId,
      operationId,
      path: entry.dst.path,
      existingType: existing.type,
      incomingType: "file",
      jobDecision: conflictDecision,
    });
    if (decision === "skip") return { bytes: 0 };
    if (decision === "overwrite") await provider.delete(existing.remoteId);
    if (decision === "rename") {
      const siblings = await fetchSiblingNames(provider, entry.dst.parentRemoteId ?? null);
      dstName = autoRename(entry.dst.name, siblings);
      dstPath = `${entry.dst.path.replace(/\/[^/]*$/, "")}/${dstName}`;
    }
  }

  deps.log.debug(
    {
      providerId: entry.src.providerId,
      capabilities: provider.capabilities,
      srcRemoteId: entry.src.remoteId,
      dstParentRemoteId: entry.dst.parentRemoteId ?? null,
      dstName,
    },
    "move: provider resolved",
  );

  if (provider.capabilities.supportsNativeMove) {
    deps.log.debug({ srcRemoteId: entry.src.remoteId, dstParentRemoteId: entry.dst.parentRemoteId, dstName }, "move: native move");
    try {
      const result = await provider.move(
        entry.src.remoteId,
        entry.dst.parentRemoteId ?? null,
        dstName,
      );
      deps.log.debug({ result }, "move: native move done");
    } catch (err) {
      deps.log.error({ err, srcRemoteId: entry.src.remoteId, dstParentRemoteId: entry.dst.parentRemoteId }, "move: native move failed");
      throw err;
    }
    await updateNodeAfterMove(deps, entry.src.remoteId, entry.src.providerId, entry.src.path, dstPath, dstName);
    await invalidateEntryCache(deps, entry);
    return { bytes: entry.size ?? 0 };
  }

  if (provider.capabilities.supportsNativeCopy) {
    deps.log.debug({ srcRemoteId: entry.src.remoteId }, "move: copy+delete fallback");
    await provider.copy(
      entry.src.remoteId,
      entry.dst.parentRemoteId ?? null,
      dstName,
    );
    await provider.delete(entry.src.remoteId);
    deps.log.debug({ srcRemoteId: entry.src.remoteId }, "move: copy+delete done");
    // S3 has no hierarchical parent ids — soft-delete old key, the new key
    // will be picked up on next listChildren.
    await deps.db
      .update(schema.nodes)
      .set({ deletedAt: sql`now()` })
      .where(
        and(
          eq(schema.nodes.providerId, entry.src.providerId),
          eq(schema.nodes.remoteId, entry.src.remoteId),
        ),
      );
    await invalidateEntryCache(deps, entry);
    return { bytes: entry.size ?? 0 };
  }

  // Last resort — no native copy or move. Stream through.
  const raw = await provider.download(entry.src.remoteId);
  const metered = meterStream(raw, reportProgress);
  const uploaded = await provider.upload({
    parentRemoteId: entry.dst.parentRemoteId ?? null,
    name: dstName,
    stream: metered,
    size: entry.size,
  });
  await provider.delete(entry.src.remoteId);
  await deps.db
    .update(schema.nodes)
    .set({ deletedAt: sql`now()` })
    .where(
      and(
        eq(schema.nodes.providerId, entry.src.providerId),
        eq(schema.nodes.remoteId, entry.src.remoteId),
      ),
    );
  await invalidateEntryCache(deps, entry);
  return { bytes: uploaded.size ?? entry.size ?? 0 };
};

/**
 * Update the moved node's name + pathText, and rewrite all descendant paths
 * so the subtree stays consistent. parentId is left as-is because we don't
 * track the destination parent's db id in the plan entry (only remoteId +
 * pathText). Next listChildren will upsert the correct parentId.
 */
async function updateNodeAfterMove(
  deps: { db: Db },
  remoteId: string,
  providerId: string,
  srcPath: string,
  dstPath: string,
  dstName: string,
): Promise<void> {
  await deps.db
    .update(schema.nodes)
    .set({ name: dstName, pathText: dstPath, syncedAt: sql`now()` })
    .where(
      and(
        eq(schema.nodes.providerId, providerId),
        eq(schema.nodes.remoteId, remoteId),
      ),
    );

  // Rewrite descendants: replace the src path prefix with the dst path prefix.
  // e.g. /old-folder/file.txt → /new-folder/file.txt
  const escapedSrc = srcPath.replace(/%/g, "\\%").replace(/_/g, "\\_");
  const descendants = await deps.db
    .select({ id: schema.nodes.id, pathText: schema.nodes.pathText })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.providerId, providerId),
        like(schema.nodes.pathText, `${escapedSrc}/%`),
      ),
    );
  for (const d of descendants) {
    const newPath = dstPath + d.pathText.slice(srcPath.length);
    await deps.db
      .update(schema.nodes)
      .set({ pathText: newPath, syncedAt: sql`now()` })
      .where(eq(schema.nodes.id, d.id));
  }
}
