import { and, eq, inArray, sql } from "drizzle-orm";
import { Worker, type Job } from "bullmq";
import { schema } from "@drivebase/db";
import { queueForEntry, type PlanEntry, type PlanEntryKind, type QueueName } from "@drivebase/storage";
import type { WorkerDeps } from "./deps.ts";
import { maybeFinalizeOperation } from "./operation-state.ts";
import { publishProgress } from "./progress.ts";
import { JobPausedForConflict, publishConflict, type ConflictDecision } from "./conflict.ts";

/**
 * The shape every BullMQ job carries (see apps/api/services/orchestrator/enqueue.ts).
 * `jobId` is the `jobs.id` UUID — same as BullMQ's own job id for dedup.
 * `conflictDecision` is set by resolveConflict when re-enqueueing a paused job.
 */
export type JobData = {
  jobId: string;
  entry: PlanEntry;
  conflictDecision?: ConflictDecision;
};

/**
 * A per-kind handler implements this. `ctx.reportProgress(bytes)` is the
 * throttled publisher the handler calls while streaming; progress rows are
 * written to the DB only at terminal states.
 */
export type HandlerContext = {
  deps: WorkerDeps;
  jobId: string;
  operationId: string;
  entry: PlanEntry;
  conflictDecision: ConflictDecision | undefined;
  reportProgress: (bytesTransferred: number) => void;
};

export type Handler = (ctx: HandlerContext) => Promise<{ bytes?: number }>;

/**
 * Wrap a handler into a BullMQ Worker. The wrapper owns all DB bookkeeping:
 *
 *   1. On entry → UPDATE jobs SET status='running', started_at=now(), attempt_count++.
 *      Skip if the job row is already terminal (cancelled upstream).
 *   2. Invoke the handler; pipe `reportProgress(bytes)` to throttled
 *      Redis PUBLISHes.
 *   3. On success → SET status='succeeded', bytes_transferred, completed_at.
 *      Then maybeFinalizeOperation() to aggregate the parent op.
 *   4. On throw → rethrow to BullMQ (it'll retry with exponential backoff
 *      per defaultJobOptions). Final failure is handled in `failed` event.
 *
 * The `jobId` lookup is the ONE query per handler invocation; everything
 * else is cached.
 */
export function createWorker(
  deps: WorkerDeps,
  queue: QueueName,
  concurrency: number,
  handler: Handler,
): Worker<JobData> {
  const worker = new Worker<JobData>(
    queue,
    async (job) => runWrapped(deps, handler, job),
    { connection: deps.primary, concurrency },
  );

  worker.on("failed", async (job, err) => {
    if (!job) return;
    const { jobId, entry } = job.data;
    const errorMsg = err instanceof Error ? err.message : String(err);
    deps.log.error(
      { jobId, error: errorMsg, attempts: job.attemptsMade },
      "worker: job terminally failed after all retries",
    );
    // BullMQ only fires `failed` after the last attempt. Persist the
    // terminal state and roll the operation forward.
    const operationId = await markJobFailed(deps, jobId, errorMsg);
    if (!operationId) return;
    await publishProgress(deps.pub, {
      kind: "status",
      operationId,
      jobId,
      status: "failed",
      error: errorMsg,
    });

    // If a createFolder job fails terminally, all its held-back descendants
    // will never be enqueued. Mark them skipped so the operation can finalize.
    if (entry.kind === "createFolder") {
      await cascadeSkipDescendants(deps, jobId, operationId);
    }

    await maybeFinalizeOperation({
      db: deps.db,
      pub: deps.pub,
      operationId,
      getQueue: deps.getQueue,
    });
  });

  worker.on("error", (err) => {
    deps.log.error({ err, queue }, "bullmq worker error");
  });

  return worker;
}

async function runWrapped(
  deps: WorkerDeps,
  handler: Handler,
  job: Job<JobData>,
): Promise<void> {
  const { jobId, entry, conflictDecision } = job.data;

  // Flip jobs row → running. If the row is already terminal, short-circuit.
  // `awaiting_conflict` is included: re-enqueued after user resolves conflict.
  const [row] = await deps.db
    .update(schema.jobs)
    .set({
      status: "running",
      startedAt: sql`coalesce(started_at, now())`,
      attemptCount: sql`attempt_count + 1`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(schema.jobs.id, jobId),
        sql`${schema.jobs.status} in ('queued', 'running', 'failed', 'awaiting_conflict')`,
      ),
    )
    .returning({ operationId: schema.jobs.operationId });
  if (!row) {
    deps.log.debug({ jobId }, "job row missing or terminal; skipping");
    return;
  }
  const { operationId } = row;

  deps.log.debug(
    {
      jobId,
      operationId,
      queue: job.queueName,
      entryKind: entry.kind,
      src: entry.src,
      dst: entry.dst,
      size: entry.size,
    },
    "worker: handler start",
  );

  await publishProgress(deps.pub, {
    kind: "status",
    operationId,
    jobId,
    status: "running",
  });

  // Throttle progress publishes: at most one every 500ms or every 256 KiB.
  // meterStream already throttles byte-level; this guards handlers that
  // report by other units (e.g. % of a multipart upload).
  let lastPub = 0;
  let lastBytes = 0;
  const reportProgress = (bytes: number) => {
    lastBytes = bytes;
    const now = Date.now();
    if (now - lastPub < 500) return;
    lastPub = now;
    const pct = entry.size && entry.size > 0
      ? Math.min(100, (bytes / entry.size) * 100)
      : null;
    deps.log.info(
      { jobId, operationId, entryKind: entry.kind, bytes, sizeBytes: entry.size, pct },
      "worker progress",
    );
    // Fire-and-forget; a failed PUBLISH must not kill the job.
    publishProgress(deps.pub, {
      kind: "progress",
      operationId,
      jobId,
      bytes,
      sizeBytes: entry.size,
      entryKind: entry.kind,
    }).catch((err) => deps.log.warn({ err, jobId }, "publishProgress failed"));
  };

  let result: { bytes?: number };
  try {
    result = await handler({
      deps,
      jobId,
      operationId,
      entry,
      conflictDecision,
      reportProgress,
    });
  } catch (err) {
    if (err instanceof JobPausedForConflict) {
      // Suspend the job — mark awaiting_conflict, publish event, do NOT finalize.
      await deps.db
        .update(schema.jobs)
        .set({ status: "awaiting_conflict", updatedAt: sql`now()` })
        .where(eq(schema.jobs.id, jobId));
      await publishConflict(deps, operationId, jobId, err);
      deps.log.info({ jobId, operationId, path: err.path }, "job paused for conflict");
      return;
    }
    const error = err instanceof Error ? err.message : String(err);
    deps.log.error(
      { jobId, operationId, entryKind: entry.kind, error, attempt: job.attemptsMade + 1 },
      "worker: handler failed",
    );
    throw err; // Rethrow so BullMQ handles retry
  }

  deps.log.debug(
    { jobId, operationId, entryKind: entry.kind, bytes: result.bytes },
    "worker: handler done",
  );

  const finalBytes = result.bytes ?? lastBytes;
  deps.log.info(
    { jobId, operationId, entryKind: entry.kind, finalBytes, sizeBytes: entry.size },
    "worker completed",
  );
  await deps.db
    .update(schema.jobs)
    .set({
      status: "succeeded",
      bytesTransferred: finalBytes,
      completedAt: sql`now()`,
      updatedAt: sql`now()`,
      lastError: null,
    })
    .where(eq(schema.jobs.id, jobId));

  await incrementTransferStats(deps, operationId, entry.kind, finalBytes);

  await publishProgress(deps.pub, {
    kind: "status",
    operationId,
    jobId,
    status: "succeeded",
  });

  // If this was a createFolder job, release its direct children into BullMQ
  // now that the folder is materialized. Each child inherits its own children
  // via the same mechanism when it succeeds.
  if (entry.kind === "createFolder") {
    try {
      await enqueueChildren(deps, jobId);
    } catch (err) {
      // enqueueChildren failure must not leave child jobs stranded in `queued`
      // forever — the job is already marked succeeded so BullMQ can't retry it.
      // Cascade-skip all descendants so the operation can still finalize.
      deps.log.error({ err, jobId }, "worker: enqueueChildren failed; cascading skip to descendants");
      await cascadeSkipDescendants(deps, jobId, operationId).catch((e) =>
        deps.log.error({ e, jobId }, "worker: cascadeSkipDescendants also failed"),
      );
    }
  }

  await maybeFinalizeOperation({
    db: deps.db,
    pub: deps.pub,
    operationId,
    getQueue: deps.getQueue,
  });
}

/** Mark a job as terminally failed and return its operationId (null if gone). */
async function markJobFailed(
  deps: WorkerDeps,
  jobId: string,
  error: string,
): Promise<string | null> {
  const [row] = await deps.db
    .update(schema.jobs)
    .set({
      status: "failed",
      lastError: error,
      completedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(schema.jobs.id, jobId))
    .returning({ operationId: schema.jobs.operationId });
  return row?.operationId ?? null;
}

async function incrementTransferStats(
  deps: WorkerDeps,
  operationId: string,
  kind: PlanEntryKind,
  bytes: number,
): Promise<void> {
  if (kind === "createFolder" || kind === "delete" || bytes === 0) return;

  const [op] = await deps.db
    .select({ userId: schema.operations.userId })
    .from(schema.operations)
    .where(eq(schema.operations.id, operationId))
    .limit(1);
  if (!op) return;

  const s = schema.transferStats;

  if (kind === "upload") {
    await deps.db
      .insert(s)
      .values({ userId: op.userId, bytesUploaded: bytes, filesUploaded: 1 })
      .onConflictDoUpdate({
        target: s.userId,
        set: {
          bytesUploaded: sql`${s.bytesUploaded} + ${bytes}`,
          filesUploaded: sql`${s.filesUploaded} + 1`,
          updatedAt: sql`now()`,
        },
      });
  } else {
    await deps.db
      .insert(s)
      .values({ userId: op.userId, bytesTransferred: bytes, filesTransferred: 1 })
      .onConflictDoUpdate({
        target: s.userId,
        set: {
          bytesTransferred: sql`${s.bytesTransferred} + ${bytes}`,
          filesTransferred: sql`${s.filesTransferred} + 1`,
          updatedAt: sql`now()`,
        },
      });
  }
}

/**
 * After a createFolder job succeeds, release its direct children from the
 * "held" state by enqueuing them to BullMQ. Each child's own payload carries
 * the PlanEntry needed to pick the right queue.
 */
async function enqueueChildren(deps: WorkerDeps, parentJobId: string): Promise<void> {
  const children = await deps.db
    .select({ id: schema.jobs.id, kind: schema.jobs.kind, payload: schema.jobs.payload })
    .from(schema.jobs)
    .where(
      and(
        eq(schema.jobs.parentJobId, parentJobId),
        eq(schema.jobs.status, "queued"),
      ),
    );

  for (const child of children) {
    const entry = child.payload as unknown as PlanEntry;
    const q = await deps.getQueue(queueForEntry(entry));
    await q.add(child.kind, { jobId: child.id, entry }, { jobId: child.id });
  }
}

/**
 * When a createFolder job fails terminally, recursively mark all held
 * descendants as `skipped` so the operation can finalize instead of hanging
 * forever in `queued`.
 */
async function cascadeSkipDescendants(
  deps: WorkerDeps,
  parentJobId: string,
  operationId: string,
): Promise<void> {
  // Walk level by level — depth of real folder trees is small (< 20 typical).
  let parentIds = [parentJobId];
  while (parentIds.length > 0) {
    const children = await deps.db
      .update(schema.jobs)
      .set({ status: "skipped", completedAt: sql`now()`, updatedAt: sql`now()` })
      .where(
        and(
          inArray(schema.jobs.parentJobId, parentIds),
          eq(schema.jobs.status, "queued"),
        ),
      )
      .returning({ id: schema.jobs.id });

    for (const c of children) {
      await publishProgress(deps.pub, {
        kind: "status",
        operationId,
        jobId: c.id,
        status: "skipped",
      });
    }

    parentIds = children.map((c) => c.id);
  }
}
