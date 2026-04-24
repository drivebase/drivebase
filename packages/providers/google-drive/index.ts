import type { IStorageProvider, ProviderModule } from "@drivebase/storage";
import { ProviderError } from "@drivebase/storage";
import { googleDriveOAuth } from "./oauth.ts";
import { GoogleDriveProvider } from "./provider.ts";
import type { DriveTokens, OAuthAppCreds, PersistFn } from "./token-store.ts";

export { GoogleDriveProvider } from "./provider.ts";
export { googleDriveOAuth, DRIVE_SCOPES } from "./oauth.ts";
export type { DriveTokens, OAuthAppCreds, PersistFn } from "./token-store.ts";

/**
 * Dependencies the API / worker processes inject so the stateless provider
 * module can reach the DB for:
 *   - OAuth app client_id/client_secret lookup (to refresh tokens)
 *   - Persisting refreshed tokens back into `providers.credentials`
 *
 * This keeps the provider package free of DB/config imports — the same
 * package runs in API and workers with the same interface.
 */
export type GoogleDriveDeps = {
  /** Given an `oauth_apps.id`, return its client id + decrypted secret. */
  resolveOAuthApp: (oauthAppId: string) => Promise<OAuthAppCreds>;
  /**
   * Persist refreshed tokens against a provider row. `providerId` is
   * passed through the module metadata (`__providerId`) at instantiation
   * time. Optional — tests and probe calls can omit it.
   */
  persistTokens?: (providerId: string, next: DriveTokens) => Promise<void>;
};

/**
 * Build the google_drive `ProviderModule`. Both API and worker processes
 * call this once at boot to register the provider on the `globalRegistry`
 * with the deps bound in.
 */
export function buildGoogleDriveModule(deps: GoogleDriveDeps): ProviderModule {
  return {
    type: "google_drive",
    label: "Google Drive",
    authKind: "oauth",
    oauth: googleDriveOAuth,
    // Seed the delta-sync cursor at connect time. `changes.list` only
    // returns events *since* a cursor, so we need to fetch one now or
    // the first reconcile pass would miss everything that happened
    // between connect and the first run.
    onConnected: async (instance: IStorageProvider) => {
      if (!(instance instanceof GoogleDriveProvider)) return {};
      const changesCursor = await instance.seedCursor();
      return { changesCursor };
    },
    create: ({ credentials, metadata }) => {
      if (credentials.kind !== "oauth") {
        throw new ProviderError(
          `google_drive requires kind='oauth', got '${credentials.kind}'`,
          "google_drive",
        );
      }
      const oauthAppId = credentials.oauthAppId;
      const providerId =
        typeof metadata.__providerId === "string"
          ? metadata.__providerId
          : undefined;

      return new GoogleDriveProvider({
        tokens: {
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken,
          expiresAt: credentials.expiresAt,
        },
        oauthApp: () => deps.resolveOAuthApp(oauthAppId),
        persistTokens:
          providerId && deps.persistTokens
            ? buildPersist(deps.persistTokens, providerId)
            : undefined,
      });
    },
  };
}

function buildPersist(
  persist: NonNullable<GoogleDriveDeps["persistTokens"]>,
  providerId: string,
): PersistFn {
  return (next) => persist(providerId, next);
}
