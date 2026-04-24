import { ProviderError } from "./errors.ts";
import type { IStorageProvider, OAuthProviderModule } from "./provider.ts";
import type { ProviderCredentials } from "./types.ts";

/**
 * Factory a provider module exports. The registry calls this to build an
 * authenticated provider instance for a given row in the `providers` table.
 */
export type ProviderFactory = (args: {
  credentials: ProviderCredentials;
  metadata: Record<string, unknown>;
}) => Promise<IStorageProvider> | IStorageProvider;

/**
 * UI schema for a single credential input. Rendered by the frontend connect
 * form; the server validates shape at `connectProvider` time via the provider
 * module's own `assert*` helper. `key` is the property name on
 * `ProviderCredentials` (e.g. "accessKeyId").
 */
export type CredentialField = {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required: boolean;
  placeholder?: string;
  helpText?: string;
};

/**
 * How the provider obtains credentials. Surfaced to the frontend so it can
 * branch the connect flow (render form vs. start OAuth). Values mirror the
 * `ProviderAuthKind` GraphQL enum.
 */
export type ProviderAuthKind = "oauth" | "credentials" | "api_key" | "none";

export type ProviderModule = {
  /** Machine-readable provider type id, e.g. "s3", "google_drive", "dropbox". */
  type: string;
  /** Human-readable label. */
  label: string;
  /** How the user authenticates. Drives the UI connect flow. */
  authKind: ProviderAuthKind;
  /**
   * Fields the UI should render for non-OAuth providers. Ignored when
   * `authKind === 'oauth'` (OAuth providers collect credentials via their
   * authorize URL, not a form).
   */
  credentialFields?: CredentialField[];
  create: ProviderFactory;
  /** Present only when authKind='oauth' for this provider type. */
  oauth?: OAuthProviderModule;
  /**
   * Optional post-authenticate hook called once when a provider row is
   * first created (both at direct connect and at end-of-OAuth). Returns
   * provider-specific state to merge into `providers.metadata` (e.g.
   * initial delta cursors, root node ids). Kept on the module so the
   * resolver stays provider-agnostic — it just calls
   * `mod.onConnected?.(instance)` and merges the result.
   */
  onConnected?: (instance: IStorageProvider) => Promise<Record<string, unknown>>;
};

/**
 * Process-wide registry of provider types. Workers and API both import
 * the same instance.
 */
export class ProviderRegistry {
  private readonly modules = new Map<string, ProviderModule>();

  register(mod: ProviderModule): this {
    if (this.modules.has(mod.type)) {
      throw new ProviderError(
        `provider type "${mod.type}" already registered`,
        mod.type,
      );
    }
    this.modules.set(mod.type, mod);
    return this;
  }

  list(): ProviderModule[] {
    return Array.from(this.modules.values());
  }

  get(type: string): ProviderModule {
    const mod = this.modules.get(type);
    if (!mod) {
      throw new ProviderError(`unknown provider type "${type}"`, type);
    }
    return mod;
  }

  oauth(type: string): OAuthProviderModule {
    const mod = this.get(type);
    if (!mod.oauth) {
      throw new ProviderError(
        `provider type "${type}" does not support OAuth`,
        type,
      );
    }
    return mod.oauth;
  }

  async instantiate(
    type: string,
    credentials: ProviderCredentials,
    metadata: Record<string, unknown> = {},
  ): Promise<IStorageProvider> {
    const mod = this.get(type);
    return await mod.create({ credentials, metadata });
  }
}

export const globalRegistry = new ProviderRegistry();
