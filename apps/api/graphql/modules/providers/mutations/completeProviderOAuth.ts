import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { badInput, requireUser } from "~/graphql/errors.ts";
import {
  completeOAuth,
  OAuthCompleteError,
} from "~/services/oauth-complete.ts";

/**
 * GraphQL entry point for OAuth completion. The actual token exchange and
 * provider insertion live in `services/oauth-complete.ts` so the HTTP
 * callback route at `/oauth/callback` can run the exact same code path.
 */
export const completeProviderOAuth: MutationResolvers["completeProviderOAuth"] =
  async (_parent, { input }, ctx) => {
    const user = requireUser(ctx);
    try {
      return await completeOAuth(
        {
          db: ctx.db,
          config: ctx.config,
          registry: ctx.registry,
          redis: ctx.redis,
          log: ctx.log,
        },
        { state: input.state, code: input.code, userId: user.id },
      );
    } catch (err) {
      if (err instanceof OAuthCompleteError) {
        switch (err.detail.kind) {
          case "state_missing":
            throw badInput("oauth state expired or already consumed");
          case "state_corrupt":
            throw badInput("oauth state is corrupted");
          case "state_mismatch":
            throw badInput("oauth state does not belong to the current user");
          case "unknown_provider":
            throw badInput(
              `unknown provider type "${err.detail.providerType}"`,
            );
          case "provider_not_oauth":
            throw badInput(
              `provider type "${err.detail.providerType}" does not support OAuth`,
            );
        }
      }
      throw err;
    }
  };
