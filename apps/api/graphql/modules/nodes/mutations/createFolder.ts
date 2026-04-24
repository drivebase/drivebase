import { and, eq, isNull } from "drizzle-orm";
import { schema } from "@drivebase/db";
import { joinPath } from "@drivebase/storage";
import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { badInput, notFound, requireUser } from "~/graphql/errors.ts";
import { instantiateProvider } from "~/services/providers.ts";

export const createFolder: MutationResolvers["createFolder"] = async (
  _parent,
  { providerId, parentId, name },
  ctx,
) => {
  const user = requireUser(ctx);
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw badInput("name must not be empty");
  }
  if (trimmedName.includes("/")) {
    throw badInput("name must not contain '/'");
  }

  const [provider] = await ctx.db
    .select({ id: schema.providers.id })
    .from(schema.providers)
    .where(
      and(
        eq(schema.providers.id, providerId),
        eq(schema.providers.userId, user.id),
      ),
    )
    .limit(1);
  if (!provider) throw notFound("provider");

  const [parent] = parentId
    ? await ctx.db
        .select({
          id: schema.nodes.id,
          remoteId: schema.nodes.remoteId,
          pathText: schema.nodes.pathText,
          type: schema.nodes.type,
        })
        .from(schema.nodes)
        .where(
          and(
            eq(schema.nodes.id, parentId),
            eq(schema.nodes.providerId, providerId),
            isNull(schema.nodes.deletedAt),
          ),
        )
        .limit(1)
    : [];
  if (parentId && !parent) throw notFound("parent node");
  if (parent && parent.type !== "folder") {
    throw badInput("parentId must reference a folder");
  }

  const [conflict] = await ctx.db
    .select({ id: schema.nodes.id })
    .from(schema.nodes)
    .where(
      and(
        eq(schema.nodes.providerId, providerId),
        parent
          ? eq(schema.nodes.parentId, parent.id)
          : isNull(schema.nodes.parentId),
        eq(schema.nodes.name, trimmedName),
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
    providerId,
  });

  const created = await instance.createFolder(parent?.remoteId ?? null, trimmedName);
  const [row] = await ctx.db
    .insert(schema.nodes)
    .values({
      providerId,
      remoteId: created.remoteId,
      name: created.name,
      type: created.type,
      parentId: parent?.id ?? null,
      pathText: joinPath(parent?.pathText ?? "/", created.name),
      size: created.size ?? null,
      mimeType: created.mimeType ?? null,
      checksum: created.checksum ?? null,
      remoteCreatedAt: created.remoteCreatedAt ?? null,
      remoteUpdatedAt: created.remoteUpdatedAt ?? null,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: [schema.nodes.providerId, schema.nodes.remoteId],
      set: {
        name: created.name,
        type: created.type,
        parentId: parent?.id ?? null,
        pathText: joinPath(parent?.pathText ?? "/", created.name),
        size: created.size ?? null,
        mimeType: created.mimeType ?? null,
        checksum: created.checksum ?? null,
        remoteCreatedAt: created.remoteCreatedAt ?? null,
        remoteUpdatedAt: created.remoteUpdatedAt ?? null,
        syncedAt: new Date(),
        deletedAt: null,
      },
    })
    .returning();
  if (!row) throw new Error("createFolder upsert failed");

  await ctx.cache.invalidateChildren(providerId, parent?.remoteId ?? null);
  return row;
};
