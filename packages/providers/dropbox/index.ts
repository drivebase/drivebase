import type { IStorageProvider, ProviderModule } from "@drivebase/storage";
import { ProviderError } from "@drivebase/storage";
import { dropboxOAuth } from "./oauth.ts";
import { DropboxProvider } from "./provider.ts";
import type { DropboxTokens, OAuthAppCreds, PersistFn } from "./token-store.ts";

export { DropboxProvider } from "./provider.ts";
export { dropboxOAuth, DROPBOX_SCOPES } from "./oauth.ts";
export type { DropboxTokens, OAuthAppCreds, PersistFn } from "./token-store.ts";

export type DropboxDeps = {
  resolveOAuthApp: (oauthAppId: string) => Promise<OAuthAppCreds>;
  persistTokens?: (providerId: string, next: DropboxTokens) => Promise<void>;
};

export function buildDropboxModule(deps: DropboxDeps): ProviderModule {
  return {
    type: "dropbox",
    label: "Dropbox",
    authKind: "oauth",
    oauth: dropboxOAuth,
    onConnected: async (instance: IStorageProvider) => {
      if (!(instance instanceof DropboxProvider)) return {};
      const changesCursor = await instance.seedCursor();
      return { changesCursor };
    },
    create: ({ credentials, metadata }) => {
      if (credentials.kind !== "oauth") {
        throw new ProviderError(
          `dropbox requires kind='oauth', got '${credentials.kind}'`,
          "dropbox",
        );
      }
      const oauthAppId = credentials.oauthAppId;
      const providerId =
        typeof metadata.__providerId === "string"
          ? metadata.__providerId
          : undefined;

      return new DropboxProvider({
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
  persist: NonNullable<DropboxDeps["persistTokens"]>,
  providerId: string,
): PersistFn {
  return (next) => persist(providerId, next);
}
