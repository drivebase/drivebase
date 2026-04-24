import { and, eq, isNull, sql } from "drizzle-orm";
import { schema } from "@drivebase/db";
import { parentPath, type RemoteNode } from "@drivebase/storage";
import type { WorkerDeps } from "./deps.ts";

type DestinationRef = {
  providerId: string;
  parentRemoteId?: string | null;
  path: string;
};

export async function resolveDestinationParent(
  deps: WorkerDeps,
  dst: DestinationRef,
): Promise<{ parentRemoteId: string | null; parentId: string | null }> {
  if (dst.parentRemoteId != null) {
    return {
      parentRemoteId: dst.parentRemoteId,
      parentId: await resolveParentIdByRemoteId(deps, dst.providerId, dst.parentRemoteId),
    };
  }

  const dstParentPath = parentPath(dst.path);
  if (dstParentPath === "/") {
    return { parentRemoteId: null, parentId: null };
  }

  const [row] = await deps.db
    .select({
      id: schema.nodes.id,
      remoteId: schema.nodes.remoteId,
      type: schema.nodes.type,
    })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.providerId, dst.providerId),
        eq(schema.nodes.pathText, dstParentPath),
        isNull(schema.nodes.deletedAt),
      ),
    )
    .limit(1);
  if (!row) {
    throw new Error(
      `destination parent ${dstParentPath} not materialized for ${dst.path}`,
    );
  }
  if (row.type !== "folder") {
    throw new Error(
      `destination parent ${dstParentPath} is not a folder for ${dst.path}`,
    );
  }
  return { parentRemoteId: row.remoteId, parentId: row.id };
}

export async function upsertMaterializedNode(args: {
  deps: WorkerDeps;
  providerId: string;
  parentId: string | null;
  pathText: string;
  node: RemoteNode;
}): Promise<void> {
  const { deps, providerId, parentId, pathText, node } = args;
  await deps.db
    .insert(schema.nodes)
    .values({
      providerId,
      remoteId: node.remoteId,
      name: node.name,
      type: node.type,
      parentId,
      pathText,
      size: node.size ?? null,
      mimeType: node.mimeType ?? null,
      checksum: node.checksum ?? null,
      remoteCreatedAt: node.remoteCreatedAt ?? null,
      remoteUpdatedAt: node.remoteUpdatedAt ?? null,
      syncedAt: new Date(),
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: [schema.nodes.providerId, schema.nodes.remoteId],
      set: {
        name: node.name,
        type: node.type,
        parentId,
        pathText,
        size: node.size ?? null,
        mimeType: node.mimeType ?? null,
        checksum: node.checksum ?? null,
        remoteCreatedAt: node.remoteCreatedAt ?? null,
        remoteUpdatedAt: node.remoteUpdatedAt ?? null,
        syncedAt: sql`now()`,
        deletedAt: null,
      },
    });
}

async function resolveParentIdByRemoteId(
  deps: WorkerDeps,
  providerId: string,
  parentRemoteId: string,
): Promise<string | null> {
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
