import { eq } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { WorkerDeps } from "./deps.ts";
import { publishProgress } from "./progress.ts";

export type ConflictDecision = "overwrite" | "skip" | "rename";

/**
 * Thrown by a handler when a conflict is detected and no decision is
 * available yet. The wrapper in handler.ts catches this, suspends the job
 * (`awaiting_conflict`), and publishes a ConflictDiscoveredEvent.
 */
export class JobPausedForConflict extends Error {
  constructor(
    public readonly conflictId: string,
    public readonly path: string,
    public readonly existingType: string,
    public readonly incomingType: string,
  ) {
    super(`job paused for conflict at ${path}`);
    this.name = "JobPausedForConflict";
  }
}

type LiveProvider = {
  listChildren(
    parentRemoteId: string | null,
    pageToken?: string,
  ): Promise<{
    nodes: { name: string; type: "file" | "folder"; remoteId: string }[];
    nextPageToken?: string;
  }>;
};

/**
 * Check if a destination name already exists under the given parent by asking
 * the provider directly. Returns on the first matching page entry so short
 * lists are cheap; full pagination handles large directories.
 */
export async function checkDestinationExists(
  provider: LiveProvider,
  parentRemoteId: string | null,
  name: string,
): Promise<{ type: "file" | "folder"; remoteId: string } | null> {
  let pageToken: string | undefined;
  do {
    const page = await provider.listChildren(parentRemoteId, pageToken);
    for (const node of page.nodes) {
      if (node.name === name) return { type: node.type, remoteId: node.remoteId };
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return null;
}

/**
 * Resolve what action to take for a detected conflict. Priority:
 *   1. Job-level decision (set by resolveConflict for this specific job)
 *   2. Blanket decision on the operation (set by resolveConflict applyToAll)
 *   3. Operation strategy (skip/overwrite/rename auto-apply; ask → pause)
 *
 * For `ask` strategy with no decision: creates a conflict record and throws
 * `JobPausedForConflict` to suspend the job.
 */
export async function resolveConflictDecision(args: {
  deps: WorkerDeps;
  jobId: string;
  operationId: string;
  path: string;
  existingType: "file" | "folder";
  incomingType: "file" | "folder";
  jobDecision: ConflictDecision | undefined;
}): Promise<ConflictDecision> {
  const { deps, jobId, operationId, path, existingType, incomingType, jobDecision } = args;

  if (jobDecision) return jobDecision;

  const [op] = await deps.db
    .select({
      strategy: schema.operations.strategy,
      blanket: schema.operations.blanketConflictDecision,
    })
    .from(schema.operations)
    .where(eq(schema.operations.id, operationId))
    .limit(1);
  if (!op) throw new Error(`operation ${operationId} not found`);

  if (op.blanket) return op.blanket;

  const strategy = op.strategy;
  if (strategy === "skip") return "skip";
  if (strategy === "overwrite") return "overwrite";
  if (strategy === "rename") return "rename";

  // strategy === "ask" (or "error") → pause and emit event
  const [conflict] = await deps.db
    .insert(schema.operationConflicts)
    .values({ operationId, jobId, path, existingType, incomingType })
    .returning({ id: schema.operationConflicts.id });
  if (!conflict) throw new Error("failed to insert conflict record");

  throw new JobPausedForConflict(conflict.id, path, existingType, incomingType);
}

/**
 * Generate an auto-renamed filename: "file.txt" → "file (1).txt", etc.
 * `siblingNames` is the set of names already present in the destination parent.
 */
export function autoRename(name: string, siblingNames: Set<string>): string {
  const dotIdx = name.lastIndexOf(".");
  const hasExt = dotIdx > 0;
  const base = hasExt ? name.slice(0, dotIdx) : name;
  const ext = hasExt ? name.slice(dotIdx) : "";
  let n = 1;
  let candidate = `${base} (${n})${ext}`;
  while (siblingNames.has(candidate)) {
    n++;
    candidate = `${base} (${n})${ext}`;
  }
  return candidate;
}

/**
 * Fetch sibling names in the destination parent via the provider, used for
 * auto-rename to guarantee collision-free suffix selection.
 */
export async function fetchSiblingNames(
  provider: { listChildren(parentRemoteId: string | null, pageToken?: string): Promise<{ nodes: { name: string }[]; nextPageToken?: string }> },
  parentRemoteId: string | null,
): Promise<Set<string>> {
  const names = new Set<string>();
  let pageToken: string | undefined;
  do {
    const page = await provider.listChildren(parentRemoteId, pageToken);
    for (const n of page.nodes) names.add(n.name);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return names;
}

/**
 * Publish the ConflictDiscovered event so the subscription forwards it to
 * the client. Called by the handler wrapper after catching JobPausedForConflict.
 */
export async function publishConflict(
  deps: WorkerDeps,
  operationId: string,
  jobId: string,
  pause: JobPausedForConflict,
): Promise<void> {
  await publishProgress(deps.pub, {
    kind: "conflict",
    operationId,
    jobId,
    conflictId: pause.conflictId,
    path: pause.path,
    existingType: pause.existingType,
    incomingType: pause.incomingType,
  });
}
