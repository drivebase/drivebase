import { and, eq } from "drizzle-orm";
import { globalRegistry, type ProviderRegistry } from "@drivebase/storage";
import { decryptString, encryptJson } from "@drivebase/storage";
import { s3Module } from "@drivebase/provider-s3";
import { localModule } from "@drivebase/provider-local";
import {
  buildGoogleDriveModule,
  type DriveTokens,
} from "@drivebase/provider-google-drive";
import { schema, type Db } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";

let initialized = false;

/**
 * Register every known provider module on the process-wide `globalRegistry`.
 * Both API and workers call this once at boot with their own `db` + `config`
 * so OAuth providers can resolve client secrets + persist refreshed tokens.
 * Idempotent after the first call.
 */
export function getRegistry(deps?: {
  db: Db;
  config: AppConfig;
}): ProviderRegistry {
  if (initialized) return globalRegistry;
  if (!deps) {
    throw new Error(
      "getRegistry() must be called with { db, config } on first invocation",
    );
  }
  globalRegistry.register(s3Module);
  globalRegistry.register(localModule);
  globalRegistry.register(
    buildGoogleDriveModule({
      resolveOAuthApp: async (oauthAppId) => {
        const [row] = await deps.db
          .select()
          .from(schema.oauthApps)
          .where(eq(schema.oauthApps.id, oauthAppId))
          .limit(1);
        if (!row) throw new Error(`oauth app ${oauthAppId} not found`);
        const clientSecret = await decryptString(
          deps.config.crypto.masterKeyBase64,
          row.clientSecret,
        );
        return { clientId: row.clientId, clientSecret };
      },
      persistTokens: async (providerId, next: DriveTokens) => {
        const ciphertext = await encryptJson(
          deps.config.crypto.masterKeyBase64,
          {
            accessToken: next.accessToken,
            refreshToken: next.refreshToken,
            expiresAt: next.expiresAt,
          },
        );
        await deps.db
          .update(schema.providers)
          .set({ credentials: ciphertext, updatedAt: new Date() })
          .where(and(eq(schema.providers.id, providerId)));
      },
    }),
  );
  initialized = true;
  return globalRegistry;
}
