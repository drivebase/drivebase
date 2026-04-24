import { encryptString } from "@drivebase/storage";
import { schema } from "@drivebase/db";
import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { badInput, requireUser } from "~/graphql/errors.ts";

export const createOAuthApp: MutationResolvers["createOAuthApp"] = async (
  _parent,
  { input },
  ctx,
) => {
  const user = requireUser(ctx);
  // Reject types we don't have a provider module for — prevents dangling apps.
  try {
    ctx.registry.get(input.provider);
  } catch {
    throw badInput(`unknown provider type "${input.provider}"`);
  }
  const secretBlob = await encryptString(
    ctx.config.crypto.masterKeyBase64,
    input.clientSecret,
  );
  const [row] = await ctx.db
    .insert(schema.oauthApps)
    .values({
      userId: user.id,
      provider: input.provider,
      label: input.label,
      clientId: input.clientId,
      clientSecret: secretBlob,
    })
    .returning();
  if (!row) throw new Error("insert failed");
  return row;
};
