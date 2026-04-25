import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { requireUser } from "~/graphql/errors.ts";
import { completeUploadSession as run } from "~/services/uploads/sessions.ts";

export const completeUploadSession: MutationResolvers["completeUploadSession"] =
  async (_parent, { input }, ctx) => {
    const user = requireUser(ctx);
    const parts = input.parts
      ? input.parts.map((p) => ({
          partNumber: p.partNumber,
          etag: p.etag.replaceAll('"', ""),
        }))
      : undefined;
    const updated = await run({
      deps: { db: ctx.db, config: ctx.config, registry: ctx.registry },
      userId: user.id,
      sessionId: input.sessionId,
      parts,
    });
    ctx.log.info({ sessionId: updated.id }, "upload session ready");
    void ctx.telemetry.track({ name: 'upload.completed' });
    return updated;
  };
