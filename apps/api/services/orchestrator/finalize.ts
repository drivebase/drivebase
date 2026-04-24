import { and, eq, inArray, sql } from "drizzle-orm";
import { schema, type Db } from "@drivebase/db";
import type { Redis } from "ioredis";
import { operationChannel } from "~/pubsub.ts";
import { getQueue } from "./enqueue.ts";

/**
 * Mirror of apps/workers/runtime/operation-state.ts — called from the API
 * (e.g. resolveConflict) when all jobs might be terminal after a skip decision.
 */
export async function maybeFinalizeOperation(args: {
  db: Db;
  pub: Redis;
  operationId: string;
}): Promise<void> {
  const { db, pub, operationId } = args;

  const rows = await db
    .select({ status: schema.jobs.status, count: sql<number>`count(*)::int` })
    .from(schema.jobs)
    .where(eq(schema.jobs.operationId, operationId))
    .groupBy(schema.jobs.status);

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.status, r.count);
  const pending =
    (counts.get("queued") ?? 0) +
    (counts.get("running") ?? 0) +
    (counts.get("awaiting_conflict") ?? 0);
  if (pending > 0) return;

  const terminal: "failed" | "cancelled" | "succeeded" =
    (counts.get("failed") ?? 0) > 0
      ? "failed"
      : (counts.get("cancelled") ?? 0) > 0
        ? "cancelled"
        : "succeeded";

  const updated = await db
    .update(schema.operations)
    .set({ status: terminal, completedAt: sql`now()`, updatedAt: sql`now()` })
    .where(
      and(
        eq(schema.operations.id, operationId),
        inArray(schema.operations.status, ["ready", "running"]),
      ),
    )
    .returning({ id: schema.operations.id });

  if (updated.length === 0) return;

  await pub.publish(
    operationChannel(operationId),
    JSON.stringify({ kind: "operation", operationId, status: terminal }),
  );

  // After a move-transfer succeeds, delete source nodes server-side
  if (terminal === "succeeded") {
    await maybeEnqueueSourceDelete(db, operationId).catch((err) =>
      console.error("[api source-delete]", { operationId, err }),
    );
  }
}

async function maybeEnqueueSourceDelete(db: Db, operationId: string): Promise<void> {
  const [op] = await db
    .select({ plan: schema.operations.plan, userId: schema.operations.userId })
    .from(schema.operations)
    .where(eq(schema.operations.id, operationId))
    .limit(1);

  const deleteSourceNodeIds = (op?.plan as Record<string, unknown> | null)?.deleteSourceNodeIds;
  if (!Array.isArray(deleteSourceNodeIds) || deleteSourceNodeIds.length === 0) return;
  if (!op?.userId) return;

  const sourceNodes = await db
    .select({
      remoteId: schema.nodes.remoteId,
      providerId: schema.nodes.providerId,
      pathText: schema.nodes.pathText,
      name: schema.nodes.name,
    })
    .from(schema.nodes)
    .where(inArray(schema.nodes.id, deleteSourceNodeIds as string[]));

  if (sourceNodes.length === 0) return;

  const [deleteOp] = await db
    .insert(schema.operations)
    .values({
      userId: op.userId,
      kind: "delete_tree",
      strategy: "error",
      status: "running",
    })
    .returning({ id: schema.operations.id });
  if (!deleteOp) return;

  const jobRows = await db
    .insert(schema.jobs)
    .values(
      sourceNodes.map((node) => ({
        operationId: deleteOp.id,
        kind: "delete" as const,
        payload: {
          kind: "delete",
          src: { providerId: node.providerId, remoteId: node.remoteId, path: node.pathText, name: node.name },
          dst: { providerId: node.providerId, remoteId: node.remoteId, path: node.pathText, name: node.name },
        } as Record<string, unknown>,
      })),
    )
    .returning({ id: schema.jobs.id, payload: schema.jobs.payload });

  const q = await getQueue("delete");
  for (const row of jobRows) {
    await q.add("delete", { jobId: row.id, entry: row.payload }, { jobId: row.id });
  }
}
