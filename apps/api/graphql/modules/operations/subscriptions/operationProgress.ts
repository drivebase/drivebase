import { and, eq, isNull } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { SubscriptionResolvers } from "~/graphql/__generated__/resolvers.ts";
import { notFound, requireUser } from "~/graphql/errors.ts";
import {
  operationChannel,
  type OperationProgressEvent,
} from "~/pubsub.ts";

/**
 * Live-progress subscription. Flow:
 *   1. Auth-check + verify the viewer owns the operation (ownership query only).
 *   2. Subscribe to in-process PubSub on `operation:<id>:progress` — BEFORE
 *      reading status, so no terminal event can be dropped in a race window.
 *   3. Re-read operation status. If already terminal, emit one synthetic
 *      terminal event from DB and close (handles fast ops like delete that
 *      finish before the client subscription is established).
 *   4. Otherwise stream PubSub events until the terminal `operation` kind
 *      event arrives, then close.
 *
 * Events arrive courtesy of the Redis → PubSub bridge (apps/api/bridge.ts).
 * GraphQL Yoga negotiates SSE automatically for `Accept: text/event-stream`.
 */
export const operationProgress: SubscriptionResolvers["operationProgress"] = {
  subscribe: async function* (_parent, { operationId }, ctx) {
    const user = requireUser(ctx);

    // Auth-only ownership check — no status read yet. We must subscribe to
    // PubSub BEFORE reading status to close the race where the worker
    // completes between our DB read and our subscribe call (the terminal
    // event would be dropped by PubSub with no listeners).
    const [owned] = await ctx.db
      .select({ id: schema.operations.id })
      .from(schema.operations)
      .where(
        and(
          eq(schema.operations.id, operationId),
          eq(schema.operations.userId, user.id),
        ),
      )
      .limit(1);
    if (!owned) throw notFound("operation");

    // Subscribe first — any events published after this point are buffered.
    const channel = operationChannel(operationId);
    const iter = ctx.pubsub.subscribe(
      channel as `operation:${string}:progress`,
    );

    // Re-read status now that we're subscribed. If already terminal, emit
    // the terminal event from DB and abandon the iterator (events published
    // during the gap above are discarded, which is fine — operation is done).
    const [op] = await ctx.db
      .select({ status: schema.operations.status })
      .from(schema.operations)
      .where(eq(schema.operations.id, operationId))
      .limit(1);

    if (
      op?.status === "succeeded" ||
      op?.status === "failed" ||
      op?.status === "cancelled"
    ) {
      yield {
        operationProgress: {
          kind: "operation",
          operationId,
          status: op.status,
        },
      };
      return;
    }

    // Replay any conflict events that fired before this subscription connected.
    // Workers publish ConflictDiscoveredEvent as a one-shot PubSub message; if
    // the client wasn't subscribed yet it misses them. The job stays
    // `awaiting_conflict` so we can recover by querying unresolved conflicts.
    const unresolved = await ctx.db
      .select({
        id: schema.operationConflicts.id,
        jobId: schema.operationConflicts.jobId,
        path: schema.operationConflicts.path,
        existingType: schema.operationConflicts.existingType,
        incomingType: schema.operationConflicts.incomingType,
      })
      .from(schema.operationConflicts)
      .where(
        and(
          eq(schema.operationConflicts.operationId, operationId),
          isNull(schema.operationConflicts.decidedAt),
        ),
      );
    for (const c of unresolved) {
      yield {
        operationProgress: {
          kind: "conflict",
          operationId,
          jobId: c.jobId,
          conflictId: c.id,
          path: c.path,
          existingType: c.existingType,
          incomingType: c.incomingType,
        },
      };
    }

    for await (const event of iter as AsyncIterable<OperationProgressEvent>) {
      yield { operationProgress: event };
      if (event.kind === "operation" && event.status !== "running") {
        return;
      }
    }
  },
  // `resolve` identity-maps the payload; graphql-codegen's typed resolvers
  // require the `resolve` function to exist for `Subscription` fields.
  resolve: (payload: { operationProgress: OperationProgressEvent }) =>
    payload.operationProgress,
};
