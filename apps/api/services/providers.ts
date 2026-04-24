import { and, eq } from "drizzle-orm";
import {
  decryptJson,
  decryptString,
  encryptJson,
  type IStorageProvider,
  type ProviderCredentials,
} from "@drivebase/storage";
import { schema, type Db } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";
import type { ProviderRegistry } from "@drivebase/storage";
import { notFound } from "~/graphql/errors.ts";

/**
 * Load a provider row by id (scoped to a user), decrypt its credentials, and
 * instantiate the `IStorageProvider`. This is the ONLY place credentials leave
 * the DB unencrypted — workers and resolvers both go through here.
 *
 * For oauth providers, the oauth_apps.client_secret is also pulled and merged
 * in so the provider instance can refresh tokens without re-reading the DB.
 */
export async function instantiateProvider(args: {
  db: Db;
  config: AppConfig;
  registry: ProviderRegistry;
  userId: string;
  providerId: string;
}): Promise<{ instance: IStorageProvider; type: string }> {
  const { db, config, registry, userId, providerId } = args;
  const [row] = await db
    .select()
    .from(schema.providers)
    .where(
      and(
        eq(schema.providers.id, providerId),
        eq(schema.providers.userId, userId),
      ),
    )
    .limit(1);
  if (!row) throw notFound("provider");

  if (!row.credentials) {
    throw new Error(`provider ${providerId} missing credentials blob`);
  }
  const decoded = await decryptJson<Record<string, unknown>>(
    config.crypto.masterKeyBase64,
    row.credentials,
  );
  const credentials = normalizeCredentials(row.authKind, decoded, row.oauthAppId);

  const instance = await registry.instantiate(
    row.type,
    credentials,
    { ...(row.metadata ?? {}), __providerId: row.id },
  );
  return { instance, type: row.type };
}

function normalizeCredentials(
  authKind: "oauth" | "api_key" | "credentials" | "none",
  blob: Record<string, unknown>,
  oauthAppId: string | null,
): ProviderCredentials {
  switch (authKind) {
    case "api_key":
      return { kind: "api_key", apiKey: String(blob.apiKey ?? "") };
    case "credentials":
      return {
        kind: "credentials",
        accessKeyId: String(blob.accessKeyId ?? ""),
        secretAccessKey: String(blob.secretAccessKey ?? ""),
        endpoint:
          typeof blob.endpoint === "string" ? blob.endpoint : undefined,
        region: typeof blob.region === "string" ? blob.region : undefined,
        bucket: typeof blob.bucket === "string" ? blob.bucket : undefined,
      };
    case "oauth":
      if (!oauthAppId) {
        throw new Error("oauth provider missing oauthAppId");
      }
      return {
        kind: "oauth",
        accessToken: String(blob.accessToken ?? ""),
        refreshToken:
          typeof blob.refreshToken === "string" ? blob.refreshToken : undefined,
        expiresAt:
          typeof blob.expiresAt === "number" ? blob.expiresAt : undefined,
        oauthAppId,
      };
    case "none":
      // No authentication, but may still carry config (e.g., local provider's rootDir).
      // Pass through all blob fields.
      return { kind: "none", ...blob };
  }
}

/** Encrypt an arbitrary credentials object for insertion into `providers.credentials`. */
export async function encryptCredentials(args: {
  config: AppConfig;
  value: unknown;
}) {
  return encryptJson(args.config.crypto.masterKeyBase64, args.value);
}

/** Decrypt an OAuth app's client secret. Used by the OAuth flow at token-exchange time. */
export async function decryptOAuthSecret(args: {
  config: AppConfig;
  db: Db;
  userId: string;
  oauthAppId: string;
}): Promise<{ clientId: string; clientSecret: string; provider: string }> {
  const [row] = await args.db
    .select()
    .from(schema.oauthApps)
    .where(
      and(
        eq(schema.oauthApps.id, args.oauthAppId),
        eq(schema.oauthApps.userId, args.userId),
      ),
    )
    .limit(1);
  if (!row) throw notFound("oauth app");
  const clientSecret = await decryptString(
    args.config.crypto.masterKeyBase64,
    row.clientSecret,
  );
  return { clientId: row.clientId, clientSecret, provider: row.provider };
}
