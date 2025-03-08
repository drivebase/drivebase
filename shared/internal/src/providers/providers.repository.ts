import { Injectable } from '@nestjs/common';
import type { Provider, Prisma, ProviderType } from '@prisma/client';
import { PrismaService } from '@xilehq/internal/prisma.service';

@Injectable()
export class ProvidersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProviderUncheckedCreateInput): Promise<Provider> {
    return this.prisma.provider.create({ data });
  }

  async findById(id: string): Promise<Provider | null> {
    return this.prisma.provider.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<Provider[]> {
    return this.prisma.provider.findMany({
      where: { userId },
    });
  }

  async update(
    id: string,
    data: Prisma.ProviderUncheckedUpdateInput
  ): Promise<Provider> {
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

  async findByUserIdAndType(
    userId: string,
    type: ProviderType
  ): Promise<Provider[]> {
    return this.prisma.provider.findMany({
      where: {
        userId,
        type,
      },
    });
  }
}
