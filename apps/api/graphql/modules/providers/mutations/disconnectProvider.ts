import { and, eq } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";

export const disconnectProvider: MutationResolvers["disconnectProvider"] =
  async (_parent, { id }, ctx) => {
    const user = requireUser(ctx);
    const [row] = await ctx.db
      .delete(schema.providers)
      .where(
        and(
          eq(schema.providers.id, id),
          eq(schema.providers.userId, user.id),
        ),
      )
      .returning({ type: schema.providers.type });
    if (row) {
      void ctx.telemetry.track({ name: 'provider.disconnected', data: { provider: row.type } });
    }
    return row !== undefined;
  };
