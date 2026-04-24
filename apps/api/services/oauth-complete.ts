import { schema, type Db } from "@drivebase/db";
import type { ProviderCredentials, ProviderRegistry } from "@drivebase/storage";
import type { AppConfig } from "@drivebase/config";
import type { Logger } from "@drivebase/logger";
import type { Redis } from "ioredis";
import {
  oauthStateKey,
  type OAuthStateStash,
} from "~/graphql/modules/providers/mutations/oauth-state.ts";
import { decryptOAuthSecret, encryptCredentials } from "./providers.ts";

export type CompleteOAuthInput = {
  state: string;
  code: string;
  userId: string;
};

export type CompleteOAuthDeps = {
  db: Db;
  config: AppConfig;
  registry: ProviderRegistry;
  redis: Redis;
  log: Logger;
};

export type CompleteOAuthError =
  | { kind: "state_missing" }
  | { kind: "state_corrupt" }
  | { kind: "state_mismatch" }
  | { kind: "unknown_provider"; providerType: string }
  | { kind: "provider_not_oauth"; providerType: string };

export class OAuthCompleteError extends Error {
  constructor(public readonly detail: CompleteOAuthError) {
    super(detail.kind);
  }
}

/**
 * Shared OAuth completion logic. Called from both the GraphQL resolver
 * (`completeProviderOAuth`) and the HTTP callback route at `/oauth/callback`.
 *
 * Mirrors the resolver's original behavior exactly — state is atomically
 * consumed, tokens are probed, and the provider row is persisted with
 * encrypted credentials. Throws `OAuthCompleteError` for any state/provider
 * validation failure so callers can translate to the right surface (GraphQL
 * error vs. HTML error page).
 */
export async function completeOAuth(
  deps: CompleteOAuthDeps,
  input: CompleteOAuthInput,
) {
  const raw = await deps.redis.getdel(oauthStateKey(input.state));
  if (!raw) throw new OAuthCompleteError({ kind: "state_missing" });

  let stash: OAuthStateStash;
  try {
    stash = JSON.parse(raw) as OAuthStateStash;
  } catch {
    throw new OAuthCompleteError({ kind: "state_corrupt" });
  }
  if (stash.userId !== input.userId) {
    throw new OAuthCompleteError({ kind: "state_mismatch" });
  }

  let mod;
  try {
    mod = deps.registry.get(stash.providerType);
  } catch {
    throw new OAuthCompleteError({
      kind: "unknown_provider",
      providerType: stash.providerType,
    });
  }
  if (!mod.oauth) {
    throw new OAuthCompleteError({
      kind: "provider_not_oauth",
      providerType: stash.providerType,
    });
  }

  const oauthApp = await decryptOAuthSecret({
    config: deps.config,
    db: deps.db,
    userId: input.userId,
    oauthAppId: stash.oauthAppId,
  });

  const tokens = await mod.oauth.exchangeCode({
    clientId: oauthApp.clientId,
    clientSecret: oauthApp.clientSecret,
    redirectUri: stash.redirectUri,
    code: input.code,
  });

  const oauthCreds: ProviderCredentials = {
    kind: "oauth",
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
    oauthAppId: stash.oauthAppId,
  };

  const probe = await mod.create({ credentials: oauthCreds, metadata: {} });
  const authCtx = await probe.authenticate(oauthCreds);
  const connectMetadata = (await mod.onConnected?.(probe)) ?? {};

  const encrypted = await encryptCredentials({
    config: deps.config,
    value: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    },
  });

  const [row] = await deps.db
    .insert(schema.providers)
    .values({
      userId: input.userId,
      type: stash.providerType,
      authKind: "oauth",
      label: stash.label,
      credentials: encrypted,
      metadata: { ...(authCtx.metadataPatch ?? {}), ...connectMetadata },
      oauthAppId: stash.oauthAppId,
    })
    .returning();
  if (!row) throw new Error("insert failed");
  deps.log.info(
    { providerId: row.id, type: row.type },
    "provider connected via oauth",
  );
  return row;
}
