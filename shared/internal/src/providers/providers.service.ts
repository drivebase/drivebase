import { Injectable } from '@nestjs/common';
import type { Provider } from '@prisma/client';
import { CreateProviderDto } from '@drivebase/internal/providers/dtos/create.provider.dto';
import { UpdateProviderDto } from '@drivebase/internal/providers/dtos/update.provider.dto';
import { PrismaService } from '@drivebase/internal/prisma.service';
import { providers } from './providers';
import { ProviderFactory } from './provider.factory';
import { CallbackProviderDto } from './dtos/callback.provider.dto';
@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    data: CreateProviderDto
  ): Promise<Provider> {
    return this.prisma.provider.create({
      data: {
        ...data,
        workspaceId,
        alias: data.alias || `My ${data.type}`,
      },
    });
  }

  async findById(id: string): Promise<Provider | null> {
    return this.prisma.provider.findUnique({
      where: { id },
    });
  }

  async findByWorkspaceId(workspaceId: string): Promise<Provider[]> {
    return this.prisma.provider.findMany({
      where: { workspaceId },
    });
  }

  async update(id: string, data: UpdateProviderDto): Promise<Provider> {
    return this.prisma.provider.update({
      where: { id },
      data: {
        ...data,
        keys: data.keys as unknown as Record<string, string>,
      },
    });
  }

  async delete(id: string): Promise<Provider> {
    return this.prisma.provider.delete({
      where: { id },
    });
  }

  async findByWorkspaceIdAndType(
    workspaceId: string,
    type: CreateProviderDto['type']
  ): Promise<Provider[]> {
    return this.prisma.provider.findMany({
      where: {
        workspaceId,
        type,
      },
    });
  }

  async findAvailableProviders() {
    return providers.map((provider) => ({
      type: provider.type,
      label: provider.label,
      logo: provider.logo,
    }));
  }

  async getAuthUrl(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    const providerInstance = ProviderFactory.createProvider(
      provider.type,
      provider.keys as Record<string, string>
    );

    if ('getAuthUrl' in providerInstance) {
      const authUrl = providerInstance.getAuthUrl(id);

      return {
        authUrl,
      };
    }

    return null;
  }

  async callback(body: CallbackProviderDto) {
    const provider = await this.prisma.provider.findUnique({
      where: { id: body.state },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    const providerInstance = ProviderFactory.createProvider(
      provider.type,
      provider.keys as Record<string, string>
    );

    if ('getAccessToken' in providerInstance) {
      const accessToken = await providerInstance.getAccessToken(body.code);

      if (!accessToken?.accessToken) {
        throw new Error('Failed to get access token');
      }

      await this.prisma.providerConnection.create({
        data: {
          providerId: provider.id,
          credentials: {
            ...accessToken,
          },
        },
      });
    } else {
      throw new Error('Provider does not support callback');
    }
  }
}
