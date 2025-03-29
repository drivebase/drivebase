import { AuthType, ProviderType } from '@drivebase/providers/provider.entity';

import { BaseProvider } from './base-provider';
import { ProviderRegistry } from './provider.registry';

/**
 * Factory for creating provider instances
 */
export class ProviderFactory {
  /**
   * Create a provider instance based on type and configuration
   */
  static createProvider(
    type: ProviderType,
    config: Record<string, any>,
  ): BaseProvider {
    const ProviderClass = ProviderRegistry.getProviderConstructor(type);

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
   * Get a list of OAuth provider types
   */
  static getOAuthProviders(): ProviderType[] {
    return ProviderRegistry.getAllProviders()
      .filter((metadata) => metadata.authType === AuthType.OAUTH2)
      .map((metadata) => metadata.type);
  }

  /**
   * Get a list of API key provider types
   */
  static getApiKeyProviders(): ProviderType[] {
    return ProviderRegistry.getAllProviders()
      .filter((metadata) => metadata.authType === AuthType.API_KEY)
      .map((metadata) => metadata.type);
  }

  /**
   * Get a list of basic auth provider types
   */
  static getBasicAuthProviders(): ProviderType[] {
    return ProviderRegistry.getAllProviders()
      .filter((metadata) => metadata.authType === AuthType.BASIC)
      .map((metadata) => metadata.type);
  }

  /**
   * Type guard to check if a provider is an OAuth provider
   */
  static isOAuthProvider(provider: BaseProvider): boolean {
    return provider.authType === AuthType.OAUTH2;
  }

  /**
   * Type guard to check if a provider is an API key provider
   */
  static isApiKeyProvider(provider: BaseProvider): boolean {
    return provider.authType === AuthType.API_KEY;
  }

  /**
   * Type guard to check if a provider is a basic auth provider
   */
  static isBasicAuthProvider(provider: BaseProvider): boolean {
    return provider.authType === AuthType.BASIC;
  }
}
