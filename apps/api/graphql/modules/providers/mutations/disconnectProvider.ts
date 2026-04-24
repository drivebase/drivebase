import { and, eq } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";

export const disconnectProvider: MutationResolvers["disconnectProvider"] =
  async (_parent, { id }, ctx) => {
    const user = requireUser(ctx);
    const res = await ctx.db
      .delete(schema.providers)
      .where(
        and(
          eq(schema.providers.id, id),
          eq(schema.providers.userId, user.id),
        ),
      );
    return (res as { count?: number }).count !== 0;
  };
