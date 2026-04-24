import { and, eq, like, sql } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { Handler } from "../runtime/handler.ts";
import { getProvider } from "../runtime/providers.ts";
import { invalidateEntryCache } from "../runtime/invalidate.ts";

/**
 * Delete a remote node. The orchestrator emits a single `delete` entry even
 * for subtree deletes — providers handle recursion (Drive: trashes the
 * folder; S3: deletes all keys under the prefix).
 *
 * After the provider delete succeeds we soft-delete the matching node rows
 * so tier-2 (DB freshness) doesn't serve them back on the next listChildren.
 * We mark the root node AND all descendants (path_text LIKE '/foo/%') so
 * folder deletes clean up their subtree too.
 */
export const handleDelete: Handler = async (ctx) => {
  const { entry, deps } = ctx;
  const src = entry.src ?? entry.dst;
  if (!src.remoteId) throw new Error("delete entry missing remoteId");
  const provider = await getProvider({
    db: deps.db,
    config: deps.config,
    registry: deps.registry,
    providerId: src.providerId,
  });
  await provider.delete(src.remoteId);

  // Soft-delete the root node.
  await deps.db
    .update(schema.nodes)
    .set({ deletedAt: sql`now()` })
    .where(
      and(
        eq(schema.nodes.providerId, src.providerId),
        eq(schema.nodes.remoteId, src.remoteId),
      ),
    );

  // Soft-delete all descendants (catches folder subtrees on hierarchical
  // providers; S3 has no subtree rows since we don't crawl prefixes eagerly).
  await deps.db
    .update(schema.nodes)
    .set({ deletedAt: sql`now()` })
    .where(
      and(
        eq(schema.nodes.providerId, src.providerId),
        like(schema.nodes.pathText, `${src.path.replace(/%/g, "\\%").replace(/_/g, "\\_")}/%`),
      ),
    );

  await invalidateEntryCache(deps, entry);
  return { bytes: 0 };
};
