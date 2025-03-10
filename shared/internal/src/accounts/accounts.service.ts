import { Injectable } from '@nestjs/common';
import type { ProviderType } from '@prisma/client';
import { PrismaService } from '@drivebase/internal/prisma.service';
import { ProviderFactory } from '../providers/provider.factory';
import { CallbackProviderDto } from '../providers/dtos/callback.provider.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getConnectedAccounts(workspaceId: string) {
    return this.prisma.account.findMany({
      where: {
        workspaceId,
      },
    });
  }

  async findKeys(workspaceId: string, type: ProviderType) {
    const key = await this.prisma.key.findFirst({
      where: {
        workspaceId,
        type,
      },
    });

    return key?.keys as Record<string, string>;
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
    if (!data.state || !data.code) {
      throw new Error('Invalid callback data');
    }

    const workspaceId = data.state;
    const keys = await this.findKeys(workspaceId, data.type);
    const providerInstance = ProviderFactory.createProvider(data.type, keys);

    try {
      if ('getAccessToken' in providerInstance) {
        const accessToken = await providerInstance.getAccessToken(data.code);

        if (!accessToken?.accessToken) {
          throw new Error('Failed to get access token');
        }

        const { email, ...credentials } = accessToken;

        await this.prisma.account.create({
          data: {
            alias: email,
            type: data.type,
            credentials,
            workspaceId,
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
