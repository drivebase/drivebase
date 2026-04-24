import { eq } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { ProviderResolvers } from "~/graphql/__generated__/resolvers.ts";

export const usage: ProviderResolvers["usage"] = async (parent, _args, ctx) => {
  const [row] = await ctx.db
    .select()
    .from(schema.usage)
    .where(eq(schema.usage.providerId, parent.id))
    .limit(1);
  return row ?? null;
};
