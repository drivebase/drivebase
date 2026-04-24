import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";
import { executePlan as runExecute } from "~/services/orchestrator/index.ts";
import { operationChannel } from "~/pubsub.ts";

/**
 * Flip a `ready` operation to `running` and enqueue a BullMQ job per
 * plan entry. The workers will PUBLISH progress updates that the
 * subscription bridge forwards (Phase 7).
 */
export const executePlan: MutationResolvers["executePlan"] = async (
  _parent,
  { operationId },
  ctx,
) => {
  const user = requireUser(ctx);
  const result = await runExecute({
    deps: { db: ctx.db, config: ctx.config, registry: ctx.registry },
    userId: user.id,
    operationId,
  });
  ctx.log.info(
    { operationId, jobCount: result.jobIds.length },
    "plan executed",
  );
  // If all entries were skipped (0 jobs), the orchestrator already marked the
  // operation succeeded. Publish the terminal event so subscriptions close.
  const pubStatus = result.jobIds.length === 0 ? "succeeded" : "running";
  await ctx.pubsub.publish(
    operationChannel(operationId) as `operation:${string}:progress`,
    {
      kind: "operation",
      operationId,
      status: pubStatus,
    },
  );
  return result;
};
