import { and, eq, isNull } from "drizzle-orm";
import {
  joinPath,
  normalizePath,
  type IStorageProvider,
  type PlanEntry,
} from "@drivebase/storage";
import { schema, type Db } from "@drivebase/db";
import type { LocalTreeNode } from "./types.ts";

/**
 * Resolve a destination parent (node id → remoteId + path). `null` means the
 * provider root and the path is "/".
 */
export async function resolveParent(args: {
  db: Db;
  providerId: string;
  parentId: string | null;
}): Promise<{ parentRemoteId: string | null; parentPath: string }> {
  if (!args.parentId) return { parentRemoteId: null, parentPath: "/" };
  const [row] = await args.db
    .select({
      remoteId: schema.nodes.remoteId,
      pathText: schema.nodes.pathText,
    })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.id, args.parentId),
        eq(schema.nodes.providerId, args.providerId),
      ),
    )
    .limit(1);
  if (!row) throw new Error(`destination parent node ${args.parentId} not found`);
  return { parentRemoteId: row.remoteId, parentPath: row.pathText };
}

/**
 * Client-supplied local tree → flat list of createFolder/upload entries.
 * Walks depth-first so parents appear before children, which keeps
 * dependency handling simple in `enqueue.ts`.
 */
export function planFromLocalTree(args: {
  dstProviderId: string;
  parentRemoteId: string | null;
  parentPath: string;
  tree: LocalTreeNode[];
}): PlanEntry[] {
  const entries: PlanEntry[] = [];
  walk(args.tree, args.parentRemoteId, args.parentPath);
  return entries;

  function walk(
    nodes: LocalTreeNode[],
    parentRemoteId: string | null,
    parentPath: string,
  ) {
    for (const n of nodes) {
      const path = normalizePath(joinPath(parentPath, n.name));
      if (n.type === "folder") {
        entries.push({
          kind: "createFolder",
          dst: {
            providerId: args.dstProviderId,
            parentRemoteId,
            path,
            name: n.name,
          },
        });
        // Children go under the newly-created folder. We don't have its
        // `remoteId` yet — mark it by path; the worker resolves it at run time.
        walk(n.children ?? [], null, path);
      } else {
        entries.push({
          kind: "upload",
          dst: {
            providerId: args.dstProviderId,
            parentRemoteId,
            path,
            name: n.name,
          },
          size: n.size,
        });
      }
    }
  }
}

/**
 * Walk a subtree rooted at `srcNodeId` out of the local Nodes cache, emitting
 * `PlanEntry[]` ready to be rewritten for transfer/copy/move/delete.
 *
 * Uses only the DB cache — Phase 10 decides when to live-refresh. If the
 * cache is cold, caller should run `listChildren` first.
 */
export async function planFromNodesSubtree(args: {
  db: Db;
  srcNodeId: string;
  /** Target path prefix under which the subtree is re-rooted. */
  dstParentPath: string;
  /** Optional transform for each emitted entry (e.g. wrap upload as transfer). */
  mapEntry: (
    node: typeof schema.nodes.$inferSelect,
    dstPath: string,
    isRoot: boolean,
  ) => PlanEntry;
}): Promise<PlanEntry[]> {
  const [root] = await args.db
    .select()
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.id, args.srcNodeId),
        isNull(schema.nodes.deletedAt),
      ),
    )
    .limit(1);
  if (!root) throw new Error(`source node ${args.srcNodeId} not found`);

  const out: PlanEntry[] = [];
  const rootDst = normalizePath(joinPath(args.dstParentPath, root.name));
  out.push(args.mapEntry(root, rootDst, true));
  if (root.type === "folder") {
    await walkFolder(root, rootDst);
  }
  return out;

  async function walkFolder(
    parent: typeof schema.nodes.$inferSelect,
    parentDstPath: string,
  ) {
    const children = await args.db
      .select()
      .from(schema.nodes)
      .where(
        and(
          eq(schema.nodes.parentId, parent.id),
          isNull(schema.nodes.deletedAt),
        ),
      );
    for (const c of children) {
      const dst = normalizePath(joinPath(parentDstPath, c.name));
      out.push(args.mapEntry(c, dst, false));
      if (c.type === "folder") await walkFolder(c, dst);
    }
  }
}

/**
 * Refresh the local Nodes cache for a subtree so `planFromNodesSubtree` has
 * fresh data. Recursively calls `listChildren` from the provider and upserts
 * into the DB. Only used when the caller opts into a fresh crawl — the
 * default preflight path trusts the cache.
 */
export async function refreshSubtree(args: {
  provider: IStorageProvider;
  db: Db;
  root: typeof schema.nodes.$inferSelect;
}): Promise<void> {
  const { provider, db, root } = args;
  if (root.type === "file") return;
  const queue: (typeof schema.nodes.$inferSelect)[] = [root];
  while (queue.length > 0) {
    const parent = queue.shift();
    if (!parent) break;
    const page = await provider.listChildren(parent.remoteId);
    for (const rn of page.nodes) {
      const pathText = normalizePath(joinPath(parent.pathText, rn.name));
      const [row] = await db
        .insert(schema.nodes)
        .values({
          providerId: parent.providerId,
          remoteId: rn.remoteId,
          name: rn.name,
          type: rn.type,
          parentId: parent.id,
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
            parentId: parent.id,
            pathText,
            size: rn.size ?? null,
            mimeType: rn.mimeType ?? null,
            checksum: rn.checksum ?? null,
            remoteUpdatedAt: rn.remoteUpdatedAt ?? null,
            deletedAt: null,
          },
        })
        .returning();
      if (row && row.type === "folder") queue.push(row);
    }
  }
}
