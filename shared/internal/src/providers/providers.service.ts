import { Injectable } from '@nestjs/common';
import type { ProviderType } from '@prisma/client';
import { PrismaService } from '@drivebase/internal/prisma.service';
import { ProviderListItem, providers } from './providers';

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
}
