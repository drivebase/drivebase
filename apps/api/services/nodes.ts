import { and, eq, sql } from "drizzle-orm";
import { joinPath, normalizePath, type RemoteNode } from "@drivebase/storage";
import { schema, type Db } from "@drivebase/db";

/**
 * Pull `listChildren` from the provider, then upsert every returned node
 * into the `nodes` table. Returns the upserted rows in the same order the
 * provider handed them back.
 *
 * Paths are materialized from the parent's `path_text`; root = "/".
 * Phase 10 adds the Redis TTL cache, the "<60s synced" skip, and delta
 * reconciliation — for now every call re-lists.
 */
export async function syncChildren(args: {
  db: Db;
  providerId: string;
  parentId: string | null;
  remoteChildren: RemoteNode[];
}): Promise<(typeof schema.nodes.$inferSelect)[]> {
  const { db, providerId, parentId, remoteChildren } = args;

  // Compute the base path for the children.
  let basePath = "/";
  if (parentId) {
    const [parent] = await db
      .select({ pathText: schema.nodes.pathText })
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.id, parentId),
          eq(schema.nodes.providerId, providerId),
        ),
      )
      .limit(1);
    if (!parent) throw new Error(`parent node ${parentId} not found`);
    basePath = parent.pathText;
  }

  const rows: (typeof schema.nodes.$inferSelect)[] = [];
  for (const rn of remoteChildren) {
    const pathText = normalizePath(joinPath(basePath, rn.name));
    const [upserted] = await db
      .insert(schema.nodes)
      .values({
        providerId,
        remoteId: rn.remoteId,
        name: rn.name,
        type: rn.type,
        parentId,
        pathText,
        size: rn.size ?? null,
        mimeType: rn.mimeType ?? null,
        checksum: rn.checksum ?? null,
        remoteCreatedAt: rn.remoteCreatedAt ?? null,
        remoteUpdatedAt: rn.remoteUpdatedAt ?? null,
      })
      .onConflictDoUpdate({
        target: [schema.nodes.providerId, schema.nodes.remoteId],
        set: {
          name: rn.name,
          type: rn.type,
          parentId,
          pathText,
          size: rn.size ?? null,
          mimeType: rn.mimeType ?? null,
          checksum: rn.checksum ?? null,
          remoteUpdatedAt: rn.remoteUpdatedAt ?? null,
          syncedAt: sql`now()`,
          deletedAt: null,
        },
      })
      .returning();
    if (!upserted) throw new Error("upsert returned no row");
    rows.push(upserted);
  }
  return rows;
}
