import { eq } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { QueryResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";

export const myProviders: QueryResolvers["myProviders"] = async (
  _parent,
  _args,
  ctx,
) => {
  const user = requireUser(ctx);
  return ctx.db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.userId, user.id));
};
