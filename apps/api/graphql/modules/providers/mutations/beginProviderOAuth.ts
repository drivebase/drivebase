import { and, eq } from "drizzle-orm";
import { schema } from "@drivebase/db";
import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { badInput, notFound, requireUser } from "~/graphql/errors.ts";
import {
  OAUTH_STATE_TTL_SECONDS,
  buildRedirectUri,
  oauthStateKey,
  type OAuthStateStash,
} from "./oauth-state.ts";

/**
 * Provider-agnostic OAuth kickoff. The server:
 *   1. loads the oauth_apps row (scoped to the viewer),
 *   2. looks up the registered OAuthProviderModule for that app's provider,
 *   3. stashes `{ userId, oauthAppId, redirectUri, label, providerType }`
 *      in Redis keyed by a random state token (10 min TTL),
 *   4. returns the authorize URL + state.
 *
 * Every provider type that declares `oauth` on its module goes through
 * this same path — there is no per-provider branching here.
 */
export const beginProviderOAuth: MutationResolvers["beginProviderOAuth"] =
  async (_parent, { input }, ctx) => {
    const user = requireUser(ctx);

    const [app] = await ctx.db
      .select()
      .from(schema.oauthApps)
      .where(
        and(
          eq(schema.oauthApps.id, input.oauthAppId),
          eq(schema.oauthApps.userId, user.id),
        ),
      )
      .limit(1);
    if (!app) throw notFound("oauth app");

    let mod;
    try {
      mod = ctx.registry.oauth(app.provider);
    } catch {
      throw badInput(
        `provider type "${app.provider}" does not support OAuth`,
      );
    }

    const redirectUri = buildRedirectUri(ctx.config);
    const state = crypto.randomUUID();
    const stash: OAuthStateStash = {
      userId: user.id,
      oauthAppId: app.id,
      redirectUri,
      label: input.label,
      providerType: app.provider,
    };
    await ctx.redis.set(
      oauthStateKey(state),
      JSON.stringify(stash),
      "EX",
      OAUTH_STATE_TTL_SECONDS,
    );

    const authorizeUrl = mod.buildAuthorizeUrl({
      clientId: app.clientId,
      redirectUri,
      state,
    });
    ctx.log.info(
      { oauthAppId: app.id, providerType: app.provider, state },
      "oauth flow started",
    );
    return { authorizeUrl, state };
  };
