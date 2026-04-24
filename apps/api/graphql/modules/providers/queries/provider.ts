import { and, eq } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { QueryResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";

export const provider: QueryResolvers["provider"] = async (
  _parent,
  { id },
  ctx,
) => {
  const user = requireUser(ctx);
  const [row] = await ctx.db
    .select()
    .from(schema.providers)
    .where(
      and(eq(schema.providers.id, id), eq(schema.providers.userId, user.id)),
    )
    .limit(1);
  return row ?? null;
};
