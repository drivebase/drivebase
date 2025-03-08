import { Injectable } from '@nestjs/common';
import type { Provider } from '@prisma/client';
import { CreateProviderDto } from '@xilehq/internal/providers/dtos/create.provider.dto';
import { UpdateProviderDto } from '@xilehq/internal/providers/dtos/update.provider.dto';
import { PrismaService } from '@xilehq/internal/prisma.service';
import { providers } from './providers';

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
      data,
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
}
