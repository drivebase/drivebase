import { eq, sql } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";
import { instantiateProvider } from "~/services/providers.ts";

export const refreshUsage: MutationResolvers["refreshUsage"] = async (
  _parent,
  { id },
  ctx,
) => {
  const user = requireUser(ctx);
  const { instance } = await instantiateProvider({
    db: ctx.db,
    config: ctx.config,
    registry: ctx.registry,
    userId: user.id,
    providerId: id,
  });
  const snap = await instance.getUsage();
  const now = new Date();
  const [row] = await ctx.db
    .insert(schema.usage)
    .values({
      providerId: id,
      total: snap.total ?? null,
      used: snap.used ?? null,
      available: snap.available ?? null,
      lastSyncedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.usage.providerId,
      set: {
        total: snap.total ?? null,
        used: snap.used ?? null,
        available: snap.available ?? null,
        lastSyncedAt: now,
      },
    })
    .returning();
  if (!row) throw new Error("usage upsert failed");
  // Touch providers.updatedAt so clients notice the change.
  await ctx.db
    .update(schema.providers)
    .set({ updatedAt: sql`now()` })
    .where(eq(schema.providers.id, id));
  return row;
};
