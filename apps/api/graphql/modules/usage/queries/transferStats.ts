import { eq } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { QueryResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";

export const transferStats: QueryResolvers["transferStats"] = async (_parent, _args, ctx) => {
  const user = requireUser(ctx);
  const [row] = await ctx.db
    .select()
    .from(schema.transferStats)
    .where(eq(schema.transferStats.userId, user.id))
    .limit(1);
  return row ?? null;
};
