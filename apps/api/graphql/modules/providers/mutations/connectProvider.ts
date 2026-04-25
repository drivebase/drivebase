import { schema } from "@drivebase/db";
import type { ProviderCredentials } from "@drivebase/storage";
import type { MutationResolvers } from "~/graphql/__generated__/resolvers.ts";
import { badInput, requireUser } from "~/graphql/errors.ts";
import { encryptCredentials } from "~/services/providers.ts";

/**
 * Connect a storage provider. The credentials JSON is opaque here — we
 * hand it to the provider module's `authenticate()`, and only persist if
 * the round-trip succeeds. This rejects typos (wrong bucket, bad keys)
 * at connect time instead of at first upload.
 */
export const connectProvider: MutationResolvers["connectProvider"] = async (
  _parent,
  { input },
  ctx,
) => {
  const user = requireUser(ctx);

  let mod;
  try {
    mod = ctx.registry.get(input.type);
  } catch {
    throw badInput(`unknown provider type "${input.type}"`);
  }

  const credsObj = input.credentials as Record<string, unknown>;
  const authKind = inferAuthKind(credsObj);

  // Probe the credentials before we persist anything.
  const credsForProbe = materializeForProbe(authKind, credsObj) as ProviderCredentials;
  const probe = await mod.create({
    credentials: credsForProbe,
    metadata: {},
  });
  const probeCtx = await probe.authenticate(credsForProbe);
  // Let the module contribute connect-time metadata (delta cursors, root
  // ids, etc.). Generic — any module can opt in via `onConnected`.
  const connectMetadata = (await mod.onConnected?.(probe)) ?? {};

  const encrypted = await encryptCredentials({
    config: ctx.config,
    value: credsObj,
  });

  const [row] = await ctx.db
    .insert(schema.providers)
    .values({
      userId: user.id,
      type: input.type,
      authKind,
      label: input.label,
      credentials: encrypted,
      metadata: { ...(probeCtx.metadataPatch ?? {}), ...connectMetadata },
      oauthAppId:
        typeof credsObj.oauthAppId === "string" ? credsObj.oauthAppId : null,
    })
    .returning();
  if (!row) throw new Error("insert failed");
  ctx.log.info({ providerId: row.id, type: row.type }, "provider connected");
  void ctx.telemetry.track({ name: 'provider.connected', data: { provider: row.type } });
  return row;
};

function inferAuthKind(
  creds: Record<string, unknown>,
): "oauth" | "api_key" | "credentials" | "none" {
  if (typeof creds.accessKeyId === "string") return "credentials";
  if (typeof creds.accessToken === "string") return "oauth";
  if (typeof creds.apiKey === "string") return "api_key";
  if (typeof creds.rootDir === "string") return "none"; // local provider - no auth, just config
  return "none";
}

function materializeForProbe(
  authKind: ReturnType<typeof inferAuthKind>,
  blob: Record<string, unknown>,
): Record<string, unknown> {
  // Pass credentials through as-is. Each provider module validates its own
  // expected fields in create() and authenticate(). The authKind wrapper is
  // just for the DB column; providers receive the raw blob they declared in
  // their credentialFields.
  return blob;
}
