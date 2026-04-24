import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";
import { initiateUploadSession as run } from "~/services/uploads/sessions.ts";

export const initiateUploadSession: MutationResolvers["initiateUploadSession"] =
  async (_parent, { input }, ctx) => {
    const user = requireUser(ctx);
    const result = await run({
      deps: { db: ctx.db, config: ctx.config, registry: ctx.registry },
      userId: user.id,
      operationId: input.operationId,
      chunkSizeBytesOverride: input.chunkSizeBytes ?? undefined,
    });
    ctx.log.info(
      {
        operationId: input.operationId,
        sessions: result.sessions.length,
      },
      "upload session initiated",
    );
    return {
      sessions: result.sessions,
    };
  };
