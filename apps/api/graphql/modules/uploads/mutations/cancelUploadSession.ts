import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";
import { cancelUploadSession as run } from "~/services/uploads/sessions.ts";

export const cancelUploadSession: MutationResolvers["cancelUploadSession"] =
  async (_parent, { id }, ctx) => {
    const user = requireUser(ctx);
    const updated = await run({
      deps: { db: ctx.db, config: ctx.config, registry: ctx.registry },
      userId: user.id,
      sessionId: id,
    });
    ctx.log.info(
      { sessionId: updated.id, mode: updated.mode },
      "upload session cancelled",
    );
    return updated;
  };
