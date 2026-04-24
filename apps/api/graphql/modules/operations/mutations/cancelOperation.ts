import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { notFound, requireUser } from "~/graphql/errors.ts";

/**
 * Cancel an operation. Terminal statuses (succeeded/failed/cancelled) are
 * left untouched. Queued/running jobs are marked `cancelled` in the DB so
 * the worker wrapper can exit early next tick; BullMQ job removal lives
 * in the workers package (Phase 6).
 */
export const cancelOperation: MutationResolvers["cancelOperation"] = async (
  _parent,
  { operationId },
  ctx,
) => {
  const user = requireUser(ctx);
  const [row] = await ctx.db
    .select()
    .from(schema.operations)
    .where(
      and(
        eq(schema.operations.id, operationId),
        eq(schema.operations.userId, user.id),
      ),
    )
    .limit(1);
  if (!row) throw notFound("operation");

  const terminal = row.status === "succeeded" ||
    row.status === "failed" ||
    row.status === "cancelled";
  if (terminal) return row;

  const [updated] = await ctx.db
    .update(schema.operations)
    .set({ status: "cancelled", completedAt: new Date() })
    .where(eq(schema.operations.id, operationId))
    .returning();

  await ctx.db
    .update(schema.jobs)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(schema.jobs.operationId, operationId),
        inArray(schema.jobs.status, ["queued", "running"]),
      ),
    );

  if (!updated) throw new Error("cancel update returned no row");
  return updated;
};
