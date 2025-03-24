import { ProviderType } from '@prisma/client';
import {
  BaseProvider,
  OAuthProvider,
  ApiKeyProvider,
} from './provider.interface';
import { GoogleDriveProvider } from './providers/google-drive.provider';
import { DropboxProvider } from './providers/dropbox.provider';
import { TelegramProvider } from './providers/telegram.provider';
import { LocalProvider } from './providers/local.provider';
import { AwsS3Provider } from './providers/aws.s3.provider';

type ProviderConstructor = new (config: Record<string, string>) => BaseProvider;

export const OAuthProviders: ProviderType[] = [
  ProviderType.GOOGLE_DRIVE,
  ProviderType.DROPBOX,
];
export const ApiKeyProviders: ProviderType[] = [
  ProviderType.LOCAL,
  ProviderType.TELEGRAM,
  ProviderType.AMAZON_S3,
];

export class ProviderFactory {
  private static providers = new Map<ProviderType, ProviderConstructor>();

  // Initialize providers map
  static {
    this.providers.set(ProviderType.GOOGLE_DRIVE, GoogleDriveProvider);
    this.providers.set(ProviderType.DROPBOX, DropboxProvider);
    this.providers.set(ProviderType.TELEGRAM, TelegramProvider);
    this.providers.set(ProviderType.LOCAL, LocalProvider);
    this.providers.set(ProviderType.AMAZON_S3, AwsS3Provider);
  }

  /**
   * Register a new provider type with its constructor
   */
  static registerProvider(
    type: ProviderType,
    constructor: ProviderConstructor
  ): void {
    this.providers.set(type, constructor);
  }

  /**
   * Create a provider instance based on type
   */
  static createProvider(
    type: ProviderType,
    config: Record<string, string>
  ): BaseProvider {
    const ProviderClass = this.providers.get(type);

    if (!ProviderClass) {
      throw new Error(`Provider type ${type} is not supported`);
    }

    try {
      return new ProviderClass(config);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create provider: ${error.message}`);
      }
      throw new Error('Failed to create provider: Unknown error');
    }
  }

  /**
   * Create an OAuth provider instance
   */
  static createOAuthProvider(
    type: ProviderType,
    config: Record<string, string>
  ): OAuthProvider {
    const provider = this.createProvider(type, config);

    if (this.isOAuthProvider(provider)) {
      return provider;
    }

    throw new Error(`Provider type ${type} is not an OAuth provider`);
  }

  /**
   * Create an API Key provider instance
   */
  static createApiKeyProvider(
    type: ProviderType,
    config: Record<string, string>
  ): ApiKeyProvider {
    const provider = this.createProvider(type, config);

    if (this.isApiKeyProvider(provider)) {
      return provider;
    }

    throw new Error(`Provider type ${type} is not an API Key provider`);
  }

  /**
   * Type guard for OAuth providers
   */
  static isOAuthProvider(provider: BaseProvider): provider is OAuthProvider {
    return (
      'getAuthUrl' in provider &&
      'getAccessToken' in provider &&
      'refreshAccessToken' in provider
    );
  }

  /**
   * Type guard for API Key providers
   */
  static isApiKeyProvider(provider: BaseProvider): provider is ApiKeyProvider {
    return 'validateCredentials' in provider;
  }
}
