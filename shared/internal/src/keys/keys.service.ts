import { Injectable } from '@nestjs/common';
import { Key, ProviderType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateKeyDto } from './dtos/create.key.dto';
import { UpdateKeyDto } from './dtos/update.key.dto';

@Injectable()
export class KeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, data: CreateKeyDto): Promise<Key> {
    return this.prisma.key.create({
      data: {
        ...data,
        workspaceId,
      },
    });
  }

  async findById(id: string): Promise<Key | null> {
    return this.prisma.key.findUnique({
      where: { id },
    });
  }

  async findByWorkspaceId(workspaceId: string): Promise<Key[]> {
    return this.prisma.key.findMany({
      where: { workspaceId },
    });
  }

  async findByWorkspaceIdAndType(
    workspaceId: string,
    type: ProviderType
  ): Promise<Key | null> {
    return this.prisma.key.findFirst({
      where: {
        workspaceId,
        type,
      },
    });
  }

  async update(id: string, data: UpdateKeyDto): Promise<Key> {
    return this.prisma.key.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Key> {
    return this.prisma.key.delete({
      where: { id },
    });
  }

  async saveKeys(
    workspaceId: string,
    type: ProviderType,
    keys: Record<string, string>
  ): Promise<Key> {
    const existingKey = await this.prisma.key.findFirst({
      where: {
        workspaceId,
        type,
      },
    });

    if (existingKey) {
      return this.prisma.key.update({
        where: { id: existingKey.id },
        data: { keys },
      });
    }

    return this.prisma.key.create({
      data: {
        workspaceId,
        type,
        keys,
      },
    });
  }
}
