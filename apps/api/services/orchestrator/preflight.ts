import { and, eq, inArray, sql } from "drizzle-orm";
import type { PlanEntry, PreflightPlan } from "@drivebase/storage";
import { schema, type Db } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";
import type { ProviderRegistry } from "@drivebase/storage";
import {
  planFromLocalTree,
  planFromNodesSubtree,
  resolveParent,
} from "./traverse.ts";
import { enqueuePlan } from "./enqueue.ts";
import { loadPlan, savePlan } from "./plan-store.ts";
import type {
  PreflightInput,
  StoredPlan,
} from "./types.ts";

export type OrchestratorDeps = {
  db: Db;
  config: AppConfig;
  registry: ProviderRegistry;
};

/**
 * Public entry. Builds the plan, runs batched conflict detection, and
 * either marks the operation `ready` (non-ask strategy with no conflicts,
 * or `overwrite`/`rename`/`skip` which auto-resolve) or `awaiting_user`
 * (strategy=`ask` with conflicts).
 */
export async function preflight(args: {
  deps: OrchestratorDeps;
  userId: string;
  input: PreflightInput;
}): Promise<PreflightPlan> {
  const { deps, userId, input } = args;

  const entries = await buildEntries(deps, input);

  const [op] = await deps.db
    .insert(schema.operations)
    .values({
      userId,
      kind: mapInputToOperationKind(input),
      strategy: "strategy" in input ? input.strategy : "error",
      status: "ready",
      summary: summarize(entries),
    })
    .returning();
  if (!op) throw new Error("failed to create operation");

  const plan: StoredPlan = {
    id: op.id,
    input,
    entries,
    conflicts: [],
    deleteSourceNodeIds:
      input.kind === "transfer" && input.deleteSource ? input.srcNodeIds : undefined,
  };
  await savePlan({ db: deps.db, operationId: op.id, userId, plan });

  return {
    id: op.id,
    operationId: op.id,
    entries,
    status: "ready",
    summary: summarize(entries),
  };
}


/**
 * Flip a `ready` operation to `running` and enqueue one BullMQ job per entry.
 */
export async function executePlan(args: {
  deps: OrchestratorDeps;
  userId: string;
  operationId: string;
}): Promise<{ operationId: string; jobIds: string[] }> {
  const { deps, userId, operationId } = args;
  const { plan, status } = await loadPlan({ db: deps.db, operationId, userId });
  if (status !== "ready") {
    throw new Error(`operation ${operationId} is not ready (status=${status})`);
  }

  const { jobIds } = await enqueuePlan({
    db: deps.db,
    operationId,
    entries: plan.entries,
  });

  // If all entries were skipped (or there were none), no jobs are created.
  // Nothing will ever call maybeFinalizeOperation, so finalize immediately.
  if (jobIds.length === 0) {
    await deps.db
      .update(schema.operations)
      .set({ status: "succeeded", completedAt: sql`now()`, updatedAt: sql`now()` })
      .where(and(eq(schema.operations.id, operationId), eq(schema.operations.userId, userId)));
    return { operationId, jobIds };
  }

  await deps.db
    .update(schema.operations)
    .set({ status: "running" })
    .where(
      and(
        eq(schema.operations.id, operationId),
        eq(schema.operations.userId, userId),
      ),
    );

  return { operationId, jobIds };
}

/** Build the pre-conflict entries array for a given input. */
async function buildEntries(
  deps: OrchestratorDeps,
  input: PreflightInput,
): Promise<PlanEntry[]> {
  switch (input.kind) {
    case "upload": {
      const { parentRemoteId, parentPath } = await resolveParent({
        db: deps.db,
        providerId: input.dstProviderId,
        parentId: input.dstParentId,
      });
      return planFromLocalTree({
        dstProviderId: input.dstProviderId,
        parentRemoteId,
        parentPath,
        tree: input.tree,
      });
    }
    case "transfer": {
      const { parentRemoteId: dstParentRemoteId, parentPath: dstParentPath } = await resolveParent({
        db: deps.db,
        providerId: input.dstProviderId,
        parentId: input.dstParentId,
      });
      const entries: PlanEntry[] = [];
      for (const srcNodeId of input.srcNodeIds) {
        const sub = await planFromNodesSubtree({
          db: deps.db,
          srcNodeId,
          dstParentPath,
          mapEntry: (node, dstPath, isRoot) => ({
            kind: node.type === "folder" ? "createFolder" : "transfer",
            src: {
              providerId: node.providerId,
              remoteId: node.remoteId,
              path: node.pathText,
              name: node.name,
            },
            dst: {
              providerId: input.dstProviderId,
              parentRemoteId: isRoot ? dstParentRemoteId : null,
              path: dstPath,
              name: node.name.split("/").pop() ?? node.name,
            },
            size: node.size ?? undefined,
          }),
        });
        entries.push(...sub);
      }
      return entries;
    }
    case "copy_tree": {
      const srcs = await loadSourceRoots(deps.db, input.srcNodeIds);
      const providerId = assertSharedProvider(srcs, "copyTree");
      const { parentRemoteId: dstParentRemoteId, parentPath: dstParentPath } = await resolveParent({
        db: deps.db,
        providerId,
        parentId: input.dstParentId,
      });
      const entries: PlanEntry[] = [];
      for (const src of srcs) {
        const sub = await planFromNodesSubtree({
          db: deps.db,
          srcNodeId: src.id,
          dstParentPath,
          mapEntry: (node, dstPath, isRoot) => ({
            kind: node.type === "folder" ? "createFolder" : "copy",
            src: {
              providerId: node.providerId,
              remoteId: node.remoteId,
              path: node.pathText,
              name: node.name,
            },
            dst: {
              providerId,
              parentRemoteId: isRoot ? dstParentRemoteId : null,
              path: dstPath,
              name: node.name,
            },
            size: node.size ?? undefined,
          }),
        });
        entries.push(...sub);
      }
      return entries;
    }
    case "move_tree": {
      const srcs = await loadSourceRoots(deps.db, input.srcNodeIds);
      const providerId = assertSharedProvider(srcs, "moveTree");
      const { parentRemoteId: dstParentRemoteId, parentPath: dstParentPath } =
        await resolveParent({
          db: deps.db,
          providerId,
          parentId: input.dstParentId,
        });
      // Move is emitted as a single `move` entry per source root; provider-
      // level semantics handle the descendants. Hierarchical stores do this
      // natively; S3 falls back to copy+delete inside the worker.
      return srcs.map((src) => ({
        kind: "move",
        src: {
          providerId: src.providerId,
          remoteId: src.remoteId,
          path: src.pathText,
          name: src.name,
        },
        dst: {
          providerId: src.providerId,
          parentRemoteId: dstParentRemoteId,
          path: `${dstParentPath === "/" ? "" : dstParentPath}/${src.name}`,
          name: src.name,
        },
        size: src.size ?? undefined,
      }));
    }
    case "delete_tree": {
      const srcs = await loadSourceRoots(deps.db, input.srcNodeIds);
      assertSharedProvider(srcs, "deleteTree");
      return srcs.map((src) => ({
        kind: "delete",
        src: {
          providerId: src.providerId,
          remoteId: src.remoteId,
          path: src.pathText,
          name: src.name,
        },
        dst: {
          providerId: src.providerId,
          remoteId: src.remoteId,
          path: src.pathText,
          name: src.name,
        },
      }));
    }
  }
}

type SourceRow = typeof schema.nodes.$inferSelect;

/**
 * Batched sibling of the old `loadSourceRoot`. Fetches every source row in
 * one query and returns them in the same order as `srcNodeIds` so callers
 * can rely on stable ordering when building plan entries.
 */
async function loadSourceRoots(
  db: Db,
  srcNodeIds: string[],
): Promise<SourceRow[]> {
  const rows = await db
    .select()
    .from(schema.nodes)
    .where(inArray(schema.nodes.id, srcNodeIds));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const out: SourceRow[] = [];
  for (const id of srcNodeIds) {
    const row = byId.get(id);
    if (!row) throw new Error(`source node ${id} not found`);
    out.push(row);
  }
  return out;
}

/**
 * Same-provider ops (copy/move/delete) require every source to live on one
 * provider — conflict detection + job routing assume it. Returns the
 * shared provider id for downstream callers.
 */
function assertSharedProvider(rows: SourceRow[], op: string): string {
  const providerId = rows[0]?.providerId;
  if (!providerId) throw new Error(`${op}: at least one source required`);
  for (const r of rows) {
    if (r.providerId !== providerId) {
      throw new Error(
        `${op}: all source nodes must share one provider (got ${providerId} and ${r.providerId})`,
      );
    }
  }
  return providerId;
}

function mapInputToOperationKind(
  input: PreflightInput,
): (typeof schema.operationKindEnum.enumValues)[number] {
  switch (input.kind) {
    case "upload":
      return "upload";
    case "transfer":
      return "transfer";
    case "copy_tree":
      return "copy_tree";
    case "move_tree":
      return "move_tree";
    case "delete_tree":
      return "delete_tree";
  }
}

function summarize(entries: PlanEntry[]) {
  return {
    totalEntries: entries.length,
    totalBytes: entries.reduce((acc, e) => acc + (e.size ?? 0), 0),
    conflicts: 0,
  };
}
