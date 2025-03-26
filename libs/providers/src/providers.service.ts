import { PrismaService } from '@drivebase/database/prisma.service';
import { Injectable } from '@nestjs/common';
import type { Prisma, ProviderType } from '@prisma/client';

import { ProviderFactory } from './provider.factory';
import { ProviderListItem, providers } from './providers';

type OAuthSession = {
  clientId: string;
  clientSecret: string;
  workspaceId: string;
  type: ProviderType;
};
const sessions = new Map<string, OAuthSession>();
@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async findKeys(workspaceId: string, type: ProviderType) {
    const provider = await this.prisma.provider.findFirst({
      where: {
        workspaceId,
        type,
      },
    });

    return provider?.credentials as Record<string, string>;
  }

  async findProviders(workspaceId: string) {
    return this.prisma.provider.findMany({
      where: {
        workspaceId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  findAvailableProviders() {
    return providers.map((provider) => ({
      ...provider,
      class: null,
    })) as ProviderListItem[];
  }

  getAuthUrl(
    type: ProviderType,
    clientId: string,
    clientSecret: string,
    workspaceId: string,
  ) {
    const provider = providers.find((provider) => provider.type === type);

    if (!provider) {
      throw new Error('Provider not found');
    }

    if (provider.authType === 'oauth') {
      const stateId = crypto.randomUUID();
      sessions.set(stateId, {
        clientId,
        clientSecret,
        workspaceId,
        type,
      });
      const instance = ProviderFactory.createOAuthProvider(type, {
        clientId,
        clientSecret,
      });
      return instance.getAuthUrl(stateId);
    } else {
      throw new Error('Provider not supported');
    }
  }

  async callback(state: string, code: string) {
    if (!state || !code) {
      throw new Error('Invalid callback data');
    }

    const session = sessions.get(state);
    if (!session) {
      throw new Error('Session not found');
    }

    const { clientId, clientSecret, workspaceId, type } = session;

    const providerInstance = ProviderFactory.createOAuthProvider(type, {
      clientId,
      clientSecret,
    });

    try {
      if ('getAccessToken' in providerInstance) {
        const authToken = await providerInstance.getAccessToken(code);

        if (!authToken?.accessToken) {
          throw new Error('Failed to get access token');
        }

        await providerInstance.setCredentials({
          accessToken: authToken.accessToken,
        });

        const userInfo = await providerInstance.getUserInfo();
        const folderId = await providerInstance.createDrivebaseFolder();

        await this.prisma.provider.create({
          data: {
            type,
            label: userInfo.email || type,
            workspaceId,
            credentials: {
              clientId,
              clientSecret,
              ...authToken,
            },
            metadata: {
              folderId,
              userInfo,
            },
          },
        });

        sessions.delete(state);
      } else {
        throw new Error('Provider does not support callback');
      }
    } catch (error) {
      console.error(error);
      throw new Error('Failed to connect provider');
    }
  }

  async authorizeApiKey(
    workspaceId: string,
    type: ProviderType,
    credentials: Record<string, string>,
  ) {
    const fields = providers.find(
      (provider) => provider.type === type,
    )?.inputFields;

    if (!fields) {
      throw new Error('Provider not found');
    }

    const providerInstance = ProviderFactory.createApiKeyProvider(
      type,
      credentials,
    );

    await providerInstance.validateCredentials();

    const userInfo = await providerInstance.getUserInfo();

    await this.prisma.provider.create({
      data: {
        type,
        label: userInfo.email || userInfo.name || type,
        workspaceId,
        credentials,
        metadata: {
          userInfo,
        },
      },
    });
  }

  async listFiles(providerId: string, path?: string) {
    const provider = await this.prisma.provider.findUnique({
      where: {
        id: providerId,
      },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    const providerInstance = ProviderFactory.createProvider(
      provider.type,
      provider.credentials as Record<string, string>,
    );

    return providerInstance.listFiles(path);
  }

  async updateProviderMetadata(
    providerId: string,
    metadata: Record<string, unknown>,
  ) {
    const provider = await this.prisma.provider.findUnique({
      where: {
        id: providerId,
      },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    // Merge the existing metadata with the new metadata
    const existingMetadata = (provider.metadata || {}) as Record<
      string,
      unknown
    >;
    const updatedMetadata = { ...existingMetadata, ...metadata };

    return this.prisma.provider.update({
      where: {
        id: providerId,
      },
      data: {
        metadata: updatedMetadata as Prisma.InputJsonValue,
      },
    });
  }

  async updateProvider(providerId: string, data: { label?: string }) {
    const provider = await this.prisma.provider.findUnique({
      where: {
        id: providerId,
      },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    return this.prisma.provider.update({
      where: {
        id: providerId,
      },
      data,
    });
  }
}
