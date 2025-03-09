import { Injectable } from '@nestjs/common';
import type { ProviderType } from '@prisma/client';
import { PrismaService } from '@drivebase/internal/prisma.service';
import { ProviderListItem, providers } from './providers';
import { ProviderFactory } from './provider.factory';
import { CallbackProviderDto } from './dtos/callback.provider.dto';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async findKeys(workspaceId: string, type: ProviderType) {
    const key = await this.prisma.key.findFirst({
      where: {
        workspaceId,
        type,
      },
    });

    return key?.keys as Record<string, string>;
  }

  async findAvailableProviders() {
    return providers.map((provider) => ({
      ...provider,
      class: null,
    })) as ProviderListItem[];
  }

  async getAuthUrl(workspaceId: string, type: ProviderType) {
    const keys = await this.findKeys(workspaceId, type);

    const providerInstance = ProviderFactory.createProvider(type, keys);

    if ('getAuthUrl' in providerInstance) {
      const authUrl = providerInstance.getAuthUrl(workspaceId);
      return authUrl;
    }

    return null;
  }

  async callback(data: CallbackProviderDto) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: data.state },
    });

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const keys = await this.findKeys(workspace.id, data.type);

    const providerInstance = ProviderFactory.createProvider(data.type, keys);

    try {
      if ('getAccessToken' in providerInstance) {
        const accessToken = await providerInstance.getAccessToken(data.code);

        if (!accessToken?.accessToken) {
          throw new Error('Failed to get access token');
        }

        await this.prisma.provider.create({
          data: {
            type: data.type,
            credentials: {
              ...accessToken,
            },
            workspaceId: workspace.id,
          },
        });
      } else {
        throw new Error('Provider does not support callback');
      }
    } catch (error) {
      console.error(error);
      throw new Error('Failed to connect provider');
    }
  }
}
