import { and, eq } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { QueryResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";

export const operation: QueryResolvers["operation"] = async (
  _parent,
  { id },
  ctx,
) => {
  const user = requireUser(ctx);
  const [row] = await ctx.db
    .select()
    .from(schema.operations)
    .where(
      and(
        eq(schema.operations.id, id),
        eq(schema.operations.userId, user.id),
      ),
    )
    .limit(1);
  return row ?? null;
};
