import { desc, eq } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { QueryResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";

export const myOperations: QueryResolvers["myOperations"] = async (
  _parent,
  { limit },
  ctx,
) => {
  const user = requireUser(ctx);
  const cap = Math.min(Math.max(limit ?? 50, 1), 200);
  return ctx.db
    .select()
    .from(schema.operations)
    .where(eq(schema.operations.userId, user.id))
    .orderBy(desc(schema.operations.createdAt))
    .limit(cap);
};
