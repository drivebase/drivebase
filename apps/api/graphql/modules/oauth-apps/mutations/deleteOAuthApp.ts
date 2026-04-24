import { and, eq } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { badInput, requireUser } from "~/graphql/errors.ts";

export const deleteOAuthApp: MutationResolvers["deleteOAuthApp"] = async (
  _parent,
  { id },
  ctx,
) => {
  const user = requireUser(ctx);
  // Block deletion if any provider is still bound — the FK is `onDelete: restrict`
  // so the DB would reject anyway; do it here for a clean error message.
  const [bound] = await ctx.db
    .select({ id: schema.providers.id })
    .from(schema.providers)
    .where(
      and(
        eq(schema.providers.userId, user.id),
        eq(schema.providers.oauthAppId, id),
      ),
    )
    .limit(1);
  if (bound) {
    throw badInput("cannot delete: a provider is still using this OAuth app");
  }
  const res = await ctx.db
    .delete(schema.oauthApps)
    .where(
      and(eq(schema.oauthApps.id, id), eq(schema.oauthApps.userId, user.id)),
    );
  return (res as { count?: number }).count !== 0;
};
