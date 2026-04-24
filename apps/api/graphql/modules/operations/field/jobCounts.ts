import { eq, sql } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { OperationResolvers } from "~/graphql/__generated__/resolvers.ts";

/**
 * Aggregate job status counts for the parent operation. Queried on demand so
 * the main `myOperations` list query stays cheap (one DB round-trip total via
 * a GROUP BY, not N per operation).
 */
export const jobCounts: OperationResolvers["jobCounts"] = async (
  parent,
  _args,
  ctx,
) => {
  const rows = await ctx.db
    .select({
      status: schema.jobs.status,
      count: sql<number>`count(*)::int`,
    })
    .from(schema.jobs)
    .where(eq(schema.jobs.operationId, parent.id))
    .groupBy(schema.jobs.status);

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.status, r.count);

  return {
    total: rows.reduce((sum, r) => sum + r.count, 0),
    queued: counts.get("queued") ?? 0,
    running: counts.get("running") ?? 0,
    succeeded: counts.get("succeeded") ?? 0,
    failed: counts.get("failed") ?? 0,
    skipped: counts.get("skipped") ?? 0,
    cancelled: counts.get("cancelled") ?? 0,
  };
};
