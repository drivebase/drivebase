import { eq } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { QueryResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";

export const myOAuthApps: QueryResolvers["myOAuthApps"] = async (
  _parent,
  _args,
  ctx,
) => {
  const user = requireUser(ctx);
  return ctx.db
    .select()
    .from(schema.oauthApps)
    .where(eq(schema.oauthApps.userId, user.id));
};
