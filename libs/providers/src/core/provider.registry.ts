import { ProviderMetadata, ProviderType } from '../types';
import { BaseProvider } from './base-provider';

/**
 * Type for a constructor function that creates a provider instance
 */
export type ProviderConstructor = new (...args: any[]) => BaseProvider;

/**
 * Registry for provider implementations
 * This is a singleton that keeps track of all available providers
 */
export class ProviderRegistry {
  private static providers = new Map<ProviderType, ProviderConstructor>();
  private static metadata = new Map<ProviderType, ProviderMetadata>();

  /**
   * Register a provider implementation with metadata
   */
  static register(
    type: ProviderType,
    constructor: ProviderConstructor,
    metadata: ProviderMetadata,
  ): void {
    this.providers.set(type, constructor);
    this.metadata.set(type, metadata);
  }

  /**
   * Get a provider constructor by type
   */
  static getProviderConstructor(
    type: ProviderType,
  ): ProviderConstructor | undefined {
    return this.providers.get(type);
  }

  /**
   * Get provider metadata by type
   */
  static getProviderMetadata(type: ProviderType): ProviderMetadata | undefined {
    return this.metadata.get(type);
  }

  /**
   * Get all available providers
   */
  static getAllProviders(): ProviderMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * Check if a provider type is registered
   */
  static hasProvider(type: ProviderType): boolean {
    return this.providers.has(type);
  }
}
