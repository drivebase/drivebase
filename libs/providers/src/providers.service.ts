import { PrismaService } from '@drivebase/database/prisma.service';
import { Injectable } from '@nestjs/common';
import type { Prisma, Provider as DbProvider } from '@prisma/client';
import { AuthType } from '@prisma/client';

import { BaseProvider } from './core/base-provider';
import { ProviderFactory } from './core/provider.factory';
import { ProviderRegistry } from './core/provider.registry';
import {
  AuthCredentials,
  MetadataCapable,
  OAuth2Credentials,
  OAuthCapable,
  ProviderType,
} from './types';

interface OAuthSession {
  clientId: string;
  clientSecret: string;
  workspaceId: string;
  type: ProviderType;
  redirectUri: string;
}

@Injectable()
export class ProvidersService {
  private sessions = new Map<string, OAuthSession>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find provider credentials by workspace and type
   */
  async findCredentials(
    workspaceId: string,
    type: ProviderType,
  ): Promise<Record<string, any>> {
    const provider = await this.prisma.provider.findFirst({
      where: {
        workspaceId,
        type,
      },
    });

    return provider?.credentials as Record<string, any>;
  }

  /**
   * Find all providers for a workspace
   */
  async findProviders(workspaceId: string): Promise<DbProvider[]> {
    return this.prisma.provider.findMany({
      where: {
        workspaceId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get all available provider types and their metadata
   */
  findAvailableProviders() {
    return ProviderRegistry.getAllProviders().map((provider) => ({
      ...provider,
      id: provider.id,
      type: provider.type,
      displayName: provider.displayName,
      description: provider.description,
      authType: provider.authType,
      configSchema: provider.configSchema,
    }));
  }

  /**
   * Get the authentication URL for OAuth providers
   */
  getAuthUrl(
    type: ProviderType,
    clientId: string,
    clientSecret: string,
    workspaceId: string,
    redirectUri: string,
  ): string {
    const metadata = ProviderRegistry.getProviderMetadata(type);

    if (!metadata) {
      throw new Error(`Provider type ${type} not found`);
    }

    if (metadata.authType !== AuthType.OAUTH2) {
      throw new Error(
        `Provider type ${type} does not support OAuth authentication`,
      );
    }

    // Create provider instance
    const provider = ProviderFactory.createProvider(type, {
      clientId,
      clientSecret,
    });

    // Generate a state ID for session tracking
    const stateId = crypto.randomUUID();

    // Store session info
    this.sessions.set(stateId, {
      clientId,
      clientSecret,
      workspaceId,
      type,
      redirectUri,
    });

    // Get the auth URL
    // Check if the provider has an authStrategy with getAuthUrl method
    if (hasOAuthCapability(provider)) {
      return provider.authStrategy.getAuthUrl(redirectUri, stateId);
    }

    throw new Error(`Provider ${type} does not support OAuth authentication`);
  }

  /**
   * Handle OAuth callback
   */
  async handleOAuthCallback(state: string, code: string): Promise<DbProvider> {
    if (!state || !code) {
      throw new Error('Invalid callback data');
    }

    const session = this.sessions.get(state);
    if (!session) {
      throw new Error('Session not found');
    }

    const { clientId, clientSecret, workspaceId, type, redirectUri } = session;

    try {
      // Create provider
      const provider = ProviderFactory.createProvider(type, {
        clientId,
        clientSecret,
      });

      // Check if provider supports OAuth
      if (!hasOAuthCapability(provider)) {
        throw new Error(
          `Provider ${type} does not support OAuth authentication`,
        );
      }

      // Get access token using the provider's authStrategy
      const tokenResponse = await provider.authStrategy.getAccessToken(
        code,
        redirectUri,
      );

      // Combine credentials
      const fullCredentials: OAuth2Credentials = {
        clientId,
        clientSecret,
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        expiresAt: tokenResponse.expiresAt,
        tokenType: tokenResponse.tokenType,
      };

      // Authenticate provider
      await provider.authenticate(fullCredentials);

      // Get user info
      const userInfo = await provider.getUserInfo();

      // Save provider to database
      const dbProvider = await this.prisma.provider.create({
        data: {
          type,
          name: userInfo.email || userInfo.name || String(type),
          authType: AuthType.OAUTH2,
          workspaceId,
          credentials: fullCredentials as unknown as Prisma.InputJsonValue,
          metadata: {
            userInfo,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      // Clean up session
      this.sessions.delete(state);

      return dbProvider;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw new Error(`Failed to connect provider: ${error.message}`);
    }
  }

  /**
   * Authorize a provider using API key authentication
   */
  async authorizeApiKey(
    workspaceId: string,
    type: ProviderType,
    credentials: Record<string, any>,
  ): Promise<DbProvider> {
    const metadata = ProviderRegistry.getProviderMetadata(type);

    if (!metadata) {
      throw new Error(`Provider type ${type} not found`);
    }

    if (
      metadata.authType !== AuthType.API_KEY &&
      metadata.authType !== AuthType.BASIC
    ) {
      throw new Error(
        `Provider type ${type} does not support API key authentication`,
      );
    }

    try {
      // Create provider instance
      const provider = ProviderFactory.createProvider(type, credentials);

      // Authenticate
      await provider.authenticate(credentials);

      // Get user info
      const userInfo = await provider.getUserInfo();

      // Save provider to database
      return this.prisma.provider.create({
        data: {
          type,
          name: userInfo.email || userInfo.name || String(type),
          authType: metadata.authType,
          workspaceId,
          credentials: credentials as unknown as Prisma.InputJsonValue,
          metadata: {
            userInfo,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      console.error('API key authorization error:', error);
      throw new Error(`Failed to connect provider: ${error.message}`);
    }
  }

  /**
   * List files from a provider
   */
  async listFiles(providerId: string, path?: string) {
    const provider = await this.getProviderInstance(providerId);
    return provider.listFiles({ path });
  }

  /**
   * Update provider metadata
   */
  async updateProviderMetadata(
    providerId: string,
    metadata: Record<string, any>,
  ): Promise<DbProvider> {
    const dbProvider = await this.prisma.provider.findUnique({
      where: {
        id: providerId,
      },
    });

    if (!dbProvider) {
      throw new Error('Provider not found');
    }

    // Merge the existing metadata with the new metadata
    const existingMetadata = (dbProvider.metadata || {}) as Record<string, any>;
    const updatedMetadata = { ...existingMetadata, ...metadata };

    // Update provider instance if it's already active
    const provider = await this.getProviderInstance(providerId);
    if (hasMetadataCapability(provider)) {
      provider.setMetadata(metadata);
    }

    return this.prisma.provider.update({
      where: {
        id: providerId,
      },
      data: {
        metadata: updatedMetadata as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Update provider details
   */
  async updateProvider(
    providerId: string,
    data: { name?: string; isActive?: boolean },
  ): Promise<DbProvider> {
    const dbProvider = await this.prisma.provider.findUnique({
      where: {
        id: providerId,
      },
    });

    if (!dbProvider) {
      throw new Error('Provider not found');
    }

    return this.prisma.provider.update({
      where: {
        id: providerId,
      },
      data,
    });
  }

  /**
   * Upload a file to a provider
   */
  async uploadFile(providerId: string, path: string, file: any, options?: any) {
    const provider = await this.getProviderInstance(providerId);
    return provider.uploadFile(path, file, options);
  }

  /**
   * Download a file from a provider
   */
  async downloadFile(providerId: string, fileId: string) {
    const provider = await this.getProviderInstance(providerId);
    return provider.downloadFile(fileId);
  }

  /**
   * Get or create a provider instance
   */
  private async getProviderInstance(providerId: string): Promise<BaseProvider> {
    const dbProvider = await this.prisma.provider.findUnique({
      where: {
        id: providerId,
      },
    });

    if (!dbProvider) {
      throw new Error('Provider not found');
    }

    const provider = ProviderFactory.createProvider(
      dbProvider.type,
      dbProvider.credentials as Record<string, any>,
    );

    await provider.authenticate(dbProvider.credentials as AuthCredentials);

    // Apply metadata if the provider supports it
    if (hasMetadataCapability(provider) && dbProvider.metadata) {
      provider.setMetadata(dbProvider.metadata as Record<string, any>);
    }

    return provider;
  }
}

/**
 * Type guard to check if a provider has OAuth capability
 */
function hasOAuthCapability(provider: unknown): provider is OAuthCapable {
  return (
    !!provider &&
    typeof provider === 'object' &&
    'authStrategy' in provider &&
    !!provider.authStrategy &&
    typeof provider.authStrategy === 'object' &&
    'getAuthUrl' in provider.authStrategy &&
    typeof provider.authStrategy.getAuthUrl === 'function' &&
    'getAccessToken' in provider.authStrategy &&
    typeof provider.authStrategy.getAccessToken === 'function'
  );
}

/**
 * Type guard to check if a provider supports metadata
 */
function hasMetadataCapability(provider: unknown): provider is MetadataCapable {
  return (
    !!provider &&
    typeof provider === 'object' &&
    'setMetadata' in provider &&
    typeof provider.setMetadata === 'function'
  );
}
