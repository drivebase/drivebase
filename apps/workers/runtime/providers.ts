import { and, eq } from "drizzle-orm";
import {
  decryptJson,
  NotFoundError,
  type IStorageProvider,
  type ProviderCredentials,
  type ProviderRegistry,
} from "@drivebase/storage";
import { schema, type Db } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";

/**
 * Small per-process cache of instantiated provider handles. A batch op can
 * enqueue hundreds of jobs sharing the same `providerId` — decrypting creds
 * and rebuilding the provider for each would be wasteful. Keyed by the
 * provider row id.
 *
 * The cache holds the instance only; it does NOT try to refresh OAuth tokens
 * here. Provider implementations are expected to refresh on 401 internally.
 */
const cache = new Map<string, IStorageProvider>();

export async function getProvider(args: {
  db: Db;
  config: AppConfig;
  registry: ProviderRegistry;
  providerId: string;
}): Promise<IStorageProvider> {
  const hit = cache.get(args.providerId);
  if (hit) return hit;

  const [row] = await args.db
    .select()
    .from(schema.providers)
    .where(eq(schema.providers.id, args.providerId))
    .limit(1);
  if (!row) throw new NotFoundError(`provider ${args.providerId} not found`);

  if (!row.credentials) {
    throw new Error(`provider ${args.providerId} missing credentials blob`);
  }
  const decoded = await decryptJson<Record<string, unknown>>(
    args.config.crypto.masterKeyBase64,
    row.credentials,
  );
  const credentials = normalizeCredentials(row.authKind, decoded, row.oauthAppId);

  const instance = await args.registry.instantiate(
    row.type,
    credentials,
    { ...(row.metadata ?? {}), __providerId: row.id },
  );
  cache.set(args.providerId, instance);
  return instance;
}

/** Drop the cache entry — call this when a provider is disconnected or its creds rotate. */
export function evictProvider(providerId: string): void {
  cache.delete(providerId);
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
      if (!oauthAppId) throw new Error("oauth provider missing oauthAppId");
      return {
        kind: "oauth",
        accessToken: String(blob.accessToken ?? ""),
        refreshToken:
          typeof blob.refreshToken === "string"
            ? blob.refreshToken
            : undefined,
        expiresAt:
          typeof blob.expiresAt === "number" ? blob.expiresAt : undefined,
        oauthAppId,
      };
    case "none":
      // No authentication, but may still carry config (e.g., local provider's rootDir).
      return { kind: "none", ...blob };
  }
}
