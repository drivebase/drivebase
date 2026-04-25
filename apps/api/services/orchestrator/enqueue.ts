import { eq } from "drizzle-orm";
import { Queue } from "bullmq";
import { queueForEntry, parentPath, type QueueName, type PlanEntry } from "@drivebase/storage";
import { schema, type Db } from "@drivebase/db";
import { getRedis } from "~/redis/client.ts";

/**
 * Lazy queue cache. BullMQ Queue objects hold a dedicated Redis connection;
 * we reuse them across requests.
 */
const queues = new Map<QueueName, Queue>();

export async function getQueue(name: QueueName): Promise<Queue> {
  const hit = queues.get(name);
  if (hit) return hit;
  const { primary } = await getRedis();
  const q = new Queue(name, {
    connection: primary.duplicate(),
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    },
  });
  queues.set(name, q);
  return q;
}

/**
 * Insert all `jobs` rows AND enqueue root jobs to BullMQ immediately.
 *
 * Jobs whose immediate destination parent folder is also being created in
 * this operation get `parentJobId` set and are withheld from BullMQ. The
 * createFolder handler enqueues them after materializing the folder, so
 * transfer/copy jobs can never race ahead of the folder they depend on.
 *
 * The two writes (Postgres + BullMQ) are not in a single txn. If enqueue
 * fails midway, the reconciler (Phase 10) re-enqueues orphan `queued` rows
 * that have no `parentJobId` and are not yet in BullMQ.
 */
export async function enqueuePlan(args: {
  db: Db;
  operationId: string;
  entries: PlanEntry[];
}): Promise<{ jobIds: string[] }> {
  const { db, operationId, entries } = args;
  if (entries.length === 0) return { jobIds: [] };

  // Batch-insert all job rows. `.returning()` preserves insertion order on pg.
  const rows = await db
    .insert(schema.jobs)
    .values(
      entries.map((e) => ({
        operationId,
        kind: mapEntryToJobKind(e),
        payload: e as unknown as Record<string, unknown>,
        sizeBytes: e.size ?? null,
      })),
    )
    .returning({ id: schema.jobs.id, kind: schema.jobs.kind });

  // Build path → jobId for every createFolder in this plan.
  // Entries are depth-first (parents before children) so this map is always
  // populated before we look up a child's parent path.
  const folderPathToJobId = new Map<string, string>();
  for (let i = 0; i < rows.length; i++) {
    const entry = entries[i];
    const row = rows[i];
    if (entry?.kind === "createFolder" && row) {
      folderPathToJobId.set(entry.dst.path, row.id);
    }
  }

  // Set parentJobId for every job whose immediate parent folder is being
  // created in this same operation. Do this before enqueueing so workers
  // can always read a consistent parentJobId from the DB.
  const childJobIds = new Set<string>();
  const setParentPromises: Promise<unknown>[] = [];
  for (let i = 0; i < rows.length; i++) {
    const entry = entries[i];
    const row = rows[i];
    if (!entry || !row) continue;
    const parentJobId = folderPathToJobId.get(parentPath(entry.dst.path));
    if (parentJobId) {
      childJobIds.add(row.id);
      setParentPromises.push(
        db.update(schema.jobs).set({ parentJobId }).where(eq(schema.jobs.id, row.id)),
      );
    }
  }
  await Promise.all(setParentPromises);

  // Enqueue root jobs to BullMQ immediately; children are withheld until
  // their parent createFolder job succeeds.
  const jobIds: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const entry = entries[i];
    const row = rows[i];
    if (!entry || !row) continue;
    jobIds.push(row.id);
    if (childJobIds.has(row.id)) continue;
    const q = await getQueue(queueForEntry(entry));
    await q.add(row.kind, { jobId: row.id, entry }, { jobId: row.id });
  }
  return { jobIds };
}

function mapEntryToJobKind(entry: PlanEntry): (typeof schema.jobKindEnum.enumValues)[number] {
  switch (entry.kind) {
    case "upload":
      return "upload";
    case "transfer":
      return "transfer";
    case "copy":
      return "copy";
    case "move":
      return "move";
    case "delete":
      return "delete";
    case "createFolder":
      return "create_folder";
  }
}

/** Clean up BullMQ queues at shutdown. */
export async function closeQueues(): Promise<void> {
  await Promise.all(Array.from(queues.values()).map((q) => q.close()));
  queues.clear();
}
