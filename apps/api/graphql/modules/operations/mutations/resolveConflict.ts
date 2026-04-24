import { and, eq, sql } from "drizzle-orm";
import { schema, type Db } from "@drivebase/db";
import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { notFound, requireUser } from "~/graphql/errors.ts";
import { getQueue } from "~/services/orchestrator/enqueue.ts";
import { queueForEntry, type PlanEntry } from "@drivebase/storage";
import { operationChannel } from "~/pubsub.ts";
import { maybeFinalizeOperation } from "~/services/orchestrator/finalize.ts";

/**
 * Resolve a runtime conflict discovered by a worker.
 *
 * skip       → mark the job skipped immediately.
 * overwrite  → re-enqueue with decision so worker deletes existing then writes.
 * rename     → re-enqueue with decision so worker auto-suffixes the name.
 *
 * applyToAll=true writes a blanket decision on the operation so future workers
 * short-circuit, and applies the same action to all currently paused jobs.
 */
export const resolveConflict: MutationResolvers["resolveConflict"] = async (
  _parent,
  { conflictId, action, applyToAll },
  ctx,
) => {
  const user = requireUser(ctx);

  const [conflict] = await ctx.db
    .select({
      id: schema.operationConflicts.id,
      operationId: schema.operationConflicts.operationId,
      jobId: schema.operationConflicts.jobId,
    })
    .from(schema.operationConflicts)
    .innerJoin(
      schema.operations,
      and(
        eq(schema.operationConflicts.operationId, schema.operations.id),
        eq(schema.operations.userId, user.id),
      ),
    )
    .where(eq(schema.operationConflicts.id, conflictId))
    .limit(1);
  if (!conflict) throw notFound("conflict");

  const { operationId, jobId } = conflict;

  await ctx.db
    .update(schema.operationConflicts)
    .set({ decision: action, decidedAt: sql`now()` })
    .where(eq(schema.operationConflicts.id, conflictId));

  if (applyToAll) {
    await ctx.db
      .update(schema.operations)
      .set({ blanketConflictDecision: action })
      .where(eq(schema.operations.id, operationId));
  }

  const channel = operationChannel(operationId) as `operation:${string}:progress`;

  if (action === "skip") {
    await skipJob(ctx.db, jobId);
    await ctx.pubsub.publish(channel, { kind: "status", operationId, jobId, status: "skipped" });

    if (applyToAll) {
      const paused = await ctx.db
        .update(schema.jobs)
        .set({ status: "skipped", completedAt: sql`now()`, updatedAt: sql`now()` })
        .where(and(eq(schema.jobs.operationId, operationId), eq(schema.jobs.status, "awaiting_conflict")))
        .returning({ id: schema.jobs.id });
      for (const j of paused) {
        await ctx.pubsub.publish(channel, { kind: "status", operationId, jobId: j.id, status: "skipped" });
      }
    }
  } else {
    await requeueJob(ctx.db, jobId, action);

    if (applyToAll) {
      const paused = await ctx.db
        .select({ id: schema.jobs.id })
        .from(schema.jobs)
        .where(and(eq(schema.jobs.operationId, operationId), eq(schema.jobs.status, "awaiting_conflict")));
      for (const j of paused) {
        await requeueJob(ctx.db, j.id, action);
      }
    }
  }

  await maybeFinalizeOperation({ db: ctx.db, pub: ctx.redis, operationId });

  const [op] = await ctx.db
    .select()
    .from(schema.operations)
    .where(eq(schema.operations.id, operationId))
    .limit(1);
  if (!op) throw notFound("operation");
  return op;
};

async function skipJob(db: Db, jobId: string): Promise<void> {
  await db
    .update(schema.jobs)
    .set({ status: "skipped", completedAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(schema.jobs.id, jobId));
}

async function requeueJob(db: Db, jobId: string, decision: "overwrite" | "rename"): Promise<void> {
  const [job] = await db
    .select({ payload: schema.jobs.payload, kind: schema.jobs.kind })
    .from(schema.jobs)
    .where(eq(schema.jobs.id, jobId))
    .limit(1);
  if (!job) return;

  await db
    .update(schema.jobs)
    .set({ status: "queued", updatedAt: sql`now()` })
    .where(eq(schema.jobs.id, jobId));

  const entry = job.payload as unknown as PlanEntry;
  const q = await getQueue(queueForEntry(entry));
  // Intentionally omit { jobId } here — BullMQ deduplicates by custom job ID
  // and the original job is still in the completed set (removeOnComplete age=3600).
  // Using the same ID would silently no-op. A fresh BullMQ ID is fine since
  // job.data.jobId in the payload is what the worker uses to update the DB row.
  await q.add(job.kind, { jobId, entry, conflictDecision: decision });
}
