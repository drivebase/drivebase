import type { IStorageProvider, ProviderModule } from "@drivebase/storage";
import { ProviderError } from "@drivebase/storage";
import { oneDriveOAuth } from "./oauth.ts";
import { OneDriveProvider } from "./provider.ts";
import type { OneDriveTokens, OAuthAppCreds, PersistFn } from "./token-store.ts";

export { OneDriveProvider } from "./provider.ts";
export { oneDriveOAuth, ONEDRIVE_SCOPES } from "./oauth.ts";
export type { OneDriveTokens, OAuthAppCreds, PersistFn } from "./token-store.ts";

export type OneDriveDeps = {
  resolveOAuthApp: (oauthAppId: string) => Promise<OAuthAppCreds>;
  persistTokens?: (providerId: string, next: OneDriveTokens) => Promise<void>;
};

export function buildOneDriveModule(deps: OneDriveDeps): ProviderModule {
  return {
    type: "onedrive",
    label: "OneDrive",
    authKind: "oauth",
    oauth: oneDriveOAuth,
    onConnected: async (instance: IStorageProvider) => {
      if (!(instance instanceof OneDriveProvider)) return {};
      const changesCursor = await instance.seedCursor();
      return { changesCursor };
    },
    create: ({ credentials, metadata }) => {
      if (credentials.kind !== "oauth") {
        throw new ProviderError(
          `onedrive requires kind='oauth', got '${credentials.kind}'`,
          "onedrive",
        );
      }
      const oauthAppId = credentials.oauthAppId;
      const providerId =
        typeof metadata.__providerId === "string"
          ? metadata.__providerId
          : undefined;

      return new OneDriveProvider({
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
  persist: NonNullable<OneDriveDeps["persistTokens"]>,
  providerId: string,
): PersistFn {
  return (next) => persist(providerId, next);
}
