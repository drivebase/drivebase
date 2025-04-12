import { join } from 'path';
import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { BaseProvider } from './core/base-provider';
import { ProviderFactory } from './core/provider.factory';
import { ProviderRegistry } from './core/provider.registry';
import { AuthType, Provider as DbProvider, ProviderType } from './provider.entity';
import {
  AuthCredentials,
  MetadataCapable,
  OAuth2Credentials,
  OAuthCapable,
  ProviderMetadata,
} from './types';

interface OAuthSession {
  clientId: string;
  clientSecret: string;
  workspaceId: string;
  type: ProviderType;
  redirectUri: string;
}

const REDIRECT_URI = 'http://localhost:3000/oauth/callback';

@Injectable()
export class ProvidersService {
  private sessions = new Map<string, OAuthSession>();

  constructor(
    @InjectRepository(DbProvider)
    private readonly providerRepository: Repository<DbProvider>,
  ) {}

  /**
   * Find provider credentials by workspace and type
   */
  async findCredentials(workspaceId: string, type: ProviderType): Promise<Record<string, any>> {
    const provider = await this.providerRepository.findOne({
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
    return this.providerRepository.find({
      where: {
        workspaceId,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Get all available provider types and their metadata
   */
  findAvailableProviders(): ProviderMetadata[] {
    return ProviderRegistry.getAllProviders();
  }

  /**
   * Get the authentication URL for OAuth providers
   */
  getAuthUrl(
    type: ProviderType,
    clientId: string,
    clientSecret: string,
    workspaceId: string,
  ): string {
    const metadata = ProviderRegistry.getProviderMetadata(type);

    if (!metadata) {
      throw new Error(`Provider type ${type} not found`);
    }

    if (metadata.authType !== AuthType.OAUTH2) {
      throw new Error(`Provider type ${type} does not support OAuth authentication`);
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
      redirectUri: REDIRECT_URI,
    });

    // Get the auth URL
    // Check if the provider has an authStrategy with getAuthUrl method
    if (hasOAuthCapability(provider)) {
      return provider.authStrategy.getAuthUrl(REDIRECT_URI, stateId);
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
        throw new Error(`Provider ${type} does not support OAuth authentication`);
      }

      // Get access token using the provider's authStrategy
      const tokenResponse = await provider.authStrategy.getAccessToken(code, redirectUri);

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

      // Create the provider entity
      const dbProvider = this.providerRepository.create({
        type,
        name: userInfo.email || userInfo.name || String(type),
        authType: AuthType.OAUTH2,
        workspaceId,
        credentials: fullCredentials,
        metadata: {
          userInfo,
        },
      });

      // Save the provider to the database
      await this.providerRepository.save(dbProvider);

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

    if (metadata.authType !== AuthType.API_KEY && metadata.authType !== AuthType.BASIC) {
      throw new Error(`Provider type ${type} does not support API key authentication`);
    }

    try {
      // Create provider instance
      const provider = ProviderFactory.createProvider(type, credentials);

      // Authenticate
      await provider.authenticate(credentials);

      // Get user info
      const userInfo = await provider.getUserInfo();

      // Create the provider entity
      const dbProvider = this.providerRepository.create({
        type,
        name: userInfo.email || userInfo.name || String(type),
        authType: metadata.authType,
        workspaceId,
        credentials: credentials,
        metadata: {
          userInfo,
        },
        createdAt: new Date(),
      });

      // Save to database
      await this.providerRepository.save(dbProvider);

      return dbProvider;
    } catch (error) {
      console.error('API key authorization error:', error);
      throw new Error(`Failed to connect provider: ${error.message}`);
    }
  }

  /**
   * Connect a local provider
   */
  async connectLocalProvider(workspaceId: string, basePath: string): Promise<DbProvider> {
    const metadata = ProviderRegistry.getProviderMetadata(ProviderType.LOCAL);

    const provider = ProviderFactory.createProvider(ProviderType.LOCAL, {
      basePath,
    });

    try {
      await provider.authenticate({
        basePath,
      });

      const userInfo = await provider.getUserInfo();

      const dbProvider = this.providerRepository.create({
        type: ProviderType.LOCAL,
        name: userInfo.email || userInfo.name || String(ProviderType.LOCAL),
        authType: metadata?.authType,
        workspaceId,
        metadata: {
          userInfo,
          uploadPath: basePath ? basePath : join(process.cwd(), 'uploads'),
        },
        credentials: {
          basePath,
        },
      });

      await this.providerRepository.save(dbProvider);

      return dbProvider;
    } catch (error) {
      console.error('Local provider connection error:', error);
      throw new Error(`Failed to connect provider: ${error.message}`);
    }
  }

  /**
   * List files from a provider
   */
  async listFiles(providerId: string, path?: string, referenceId?: string) {
    const provider = await this.getProviderInstance(providerId);
    return provider.listFiles({ path, referenceId });
  }

  /**
   * Update provider metadata
   */
  async updateProviderMetadata(
    providerId: string,
    metadata: Record<string, any>,
  ): Promise<DbProvider> {
    const dbProvider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!dbProvider) {
      throw new Error(`Provider with ID ${providerId} not found`);
    }

    // Update provider metadata
    if (!dbProvider.metadata) {
      dbProvider.metadata = {};
    }

    // Merge existing metadata with new metadata
    dbProvider.metadata = {
      ...dbProvider.metadata,
      ...metadata,
    };

    // Save updated provider
    await this.providerRepository.save(dbProvider);

    // Update metadata in provider instance if possible
    try {
      const provider = await this.getProviderInstance(providerId);

      if (hasMetadataCapability(provider)) {
        provider.setMetadata(dbProvider.metadata);
      }
    } catch (error) {
      console.warn(`Could not update provider instance metadata: ${error.message}`);
    }

    return dbProvider;
  }

  /**
   * Update provider data
   */
  async updateProvider(
    providerId: string,
    data: { name?: string; isActive?: boolean },
  ): Promise<DbProvider> {
    const dbProvider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!dbProvider) {
      throw new Error(`Provider with ID ${providerId} not found`);
    }

    // Update fields
    if (data.name !== undefined) {
      dbProvider.name = data.name;
    }

    if (data.isActive !== undefined) {
      dbProvider.isActive = data.isActive;
    }

    // Save updated provider
    await this.providerRepository.save(dbProvider);

    return dbProvider;
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
   * Get a provider instance
   */
  private async getProviderInstance(providerId: string): Promise<BaseProvider> {
    // Find provider in database
    const dbProvider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!dbProvider) {
      throw new Error(`Provider with ID ${providerId} not found`);
    }

    if (!dbProvider.isActive) {
      throw new Error(`Provider with ID ${providerId} is not active`);
    }

    // Create provider instance
    const provider = ProviderFactory.createProvider(
      dbProvider.type,
      dbProvider.credentials as AuthCredentials,
    );

    // Authenticate provider
    await provider.authenticate(dbProvider.credentials as AuthCredentials);

    // Set metadata if available
    if (dbProvider.metadata && hasMetadataCapability(provider)) {
      provider.setMetadata(dbProvider.metadata);
    }

    return provider;
  }
}

function hasOAuthCapability(provider: unknown): provider is OAuthCapable {
  if (!provider) {
    return false;
  }

  return (
    typeof (provider as OAuthCapable).authStrategy === 'object' &&
    typeof (provider as OAuthCapable).authStrategy.getAuthUrl === 'function' &&
    typeof (provider as OAuthCapable).authStrategy.getAccessToken === 'function'
  );
}

function hasMetadataCapability(provider: unknown): provider is MetadataCapable {
  if (!provider) {
    return false;
  }

  return typeof (provider as MetadataCapable).setMetadata === 'function';
}
