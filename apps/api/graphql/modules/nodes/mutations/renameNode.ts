import { and, eq, isNull, like, ne, sql } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { badInput, notFound, requireUser } from "~/graphql/errors.ts";
import { instantiateProvider } from "~/services/providers.ts";

export const renameNode: MutationResolvers["renameNode"] = async (
  _parent,
  { nodeId, newName },
  ctx,
) => {
  const user = requireUser(ctx);
  const trimmedName = newName.trim();
  if (!trimmedName) {
    throw badInput("newName must not be empty");
  }
  if (trimmedName.includes("/")) {
    throw badInput("newName must not contain '/'");
  }

  const [node] = await ctx.db
    .select({
      id: schema.nodes.id,
      providerId: schema.nodes.providerId,
      remoteId: schema.nodes.remoteId,
      parentId: schema.nodes.parentId,
      pathText: schema.nodes.pathText,
      name: schema.nodes.name,
      type: schema.nodes.type,
      size: schema.nodes.size,
      mimeType: schema.nodes.mimeType,
      checksum: schema.nodes.checksum,
      remoteCreatedAt: schema.nodes.remoteCreatedAt,
      remoteUpdatedAt: schema.nodes.remoteUpdatedAt,
      syncedAt: schema.nodes.syncedAt,
      deletedAt: schema.nodes.deletedAt,
    })
    .from(schema.nodes)
    .innerJoin(schema.providers, eq(schema.providers.id, schema.nodes.providerId))
    .where(
      and(
        eq(schema.nodes.id, nodeId),
        eq(schema.providers.userId, user.id),
        isNull(schema.nodes.deletedAt),
      ),
    )
    .limit(1);

  if (!node) throw notFound("node");
  if (node.name === trimmedName) return node;

  const [parent] = node.parentId
    ? await ctx.db
        .select({
          remoteId: schema.nodes.remoteId,
          pathText: schema.nodes.pathText,
        })
        .from(schema.nodes)
        .where(
          and(
            eq(schema.nodes.id, node.parentId),
            eq(schema.nodes.providerId, node.providerId),
          ),
        )
        .limit(1)
    : [];

  const [conflict] = await ctx.db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.providerId, node.providerId),
        node.parentId ? eq(schema.nodes.parentId, node.parentId) : isNull(schema.nodes.parentId),
        eq(schema.nodes.name, trimmedName),
        ne(schema.nodes.id, node.id),
        isNull(schema.nodes.deletedAt),
      ),
    )
    .limit(1);
  if (conflict) {
    throw badInput(`A sibling named "${trimmedName}" already exists`);
  }

  const { instance } = await instantiateProvider({
    db: ctx.db,
    config: ctx.config,
    registry: ctx.registry,
    userId: user.id,
    providerId: node.providerId,
  });

  const moved = await instance.move(
    node.remoteId,
    parent?.remoteId ?? null,
    trimmedName,
  );

  const parentPath = parent?.pathText ?? "";
  const dstPath = `${parentPath}/${trimmedName}`;

  await ctx.db
    .update(schema.nodes)
    .set({
      name: moved.name,
      remoteId: moved.remoteId,
      pathText: dstPath,
      remoteUpdatedAt: moved.remoteUpdatedAt ?? node.remoteUpdatedAt,
      syncedAt: sql`now()`,
    })
    .where(eq(schema.nodes.id, node.id));

  const escapedSrc = node.pathText.replace(/%/g, "\\%").replace(/_/g, "\\_");
  const descendants = await ctx.db
    .select({ id: schema.nodes.id, pathText: schema.nodes.pathText })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.providerId, node.providerId),
        like(schema.nodes.pathText, `${escapedSrc}/%`),
      ),
    );

  for (const descendant of descendants) {
    await ctx.db
      .update(schema.nodes)
      .set({
        pathText: dstPath + descendant.pathText.slice(node.pathText.length),
        syncedAt: sql`now()`,
      })
      .where(eq(schema.nodes.id, descendant.id));
  }

  await ctx.cache.invalidateChildren(node.providerId, parent?.remoteId ?? null);

  const [updated] = await ctx.db
    .select()
    .from(schema.nodes)
    .where(eq(schema.nodes.id, node.id))
    .limit(1);

  if (!updated) throw notFound("node");
  return updated;
};
