import { and, eq } from "drizzle-orm";
import { schema, type Db } from "@drivebase/db";
import type { StoredPlan } from "./types.ts";

/**
 * Plans live on `operations.plan` (jsonb). That keeps the plan coupled to
 * the operation it produced — no extra table to garbage-collect.
 */
export async function savePlan(args: {
  db: Db;
  operationId: string;
  userId: string;
  plan: StoredPlan;
}): Promise<void> {
  await args.db
    .update(schema.operations)
    .set({ plan: args.plan })
    .where(
      and(
        eq(schema.operations.id, args.operationId),
        eq(schema.operations.userId, args.userId),
      ),
    );
}

export async function loadPlan(args: {
  db: Db;
  operationId: string;
  userId: string;
}): Promise<{
  plan: StoredPlan;
  status: (typeof schema.operations.$inferSelect)["status"];
  strategy: (typeof schema.operations.$inferSelect)["strategy"];
}> {
  const [row] = await args.db
    .select()
    .from(schema.operations)
    .where(
      and(
        eq(schema.operations.id, args.operationId),
        eq(schema.operations.userId, args.userId),
      ),
    )
    .limit(1);
  if (!row) throw new Error(`operation ${args.operationId} not found`);
  if (!row.plan) throw new Error(`operation ${args.operationId} has no plan`);
  return {
    plan: row.plan as unknown as StoredPlan,
    status: row.status,
    strategy: row.strategy,
  };
}
