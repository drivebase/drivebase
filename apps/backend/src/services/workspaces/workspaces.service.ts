import type { Workspace } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { CreateWorkspaceDto } from '@drivebase/backend/dtos/create.workspace.dto';
import { UpdateWorkspaceDto } from '@drivebase/backend/dtos/update.workspace.dto';
import { WorkspaceStatDto } from '@drivebase/backend/dtos/stats.workspace.dto';
import { PrismaService } from '../prisma.service';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: string,
    createWorkspaceDto: CreateWorkspaceDto,
  ): Promise<Workspace> {
    return this.prisma.workspace.create({
      data: {
        name: createWorkspaceDto.name,
        ownerId,
      },
    });
  }

  async findAll(): Promise<Workspace[]> {
    return this.prisma.workspace.findMany();
  }

  async findByUserId(ownerId: string): Promise<Workspace[]> {
    return this.prisma.workspace.findMany({
      where: { ownerId },
    });
  }

  async findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id },
    });
  }

  async update(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ): Promise<Workspace> {
    return this.prisma.workspace.update({
      where: { id },
      data: updateWorkspaceDto,
    });
  }

  async delete(id: string): Promise<Workspace> {
    return this.prisma.workspace.delete({
      where: { id },
    });
  }

  async getWorkspaceWithProviders(id: string) {
    return this.prisma.workspace.findUnique({
      where: { id },
      include: {
        providers: true,
      },
    });
  }

  async getWorkspaceStats(id: string): Promise<WorkspaceStatDto[]> {
    const files = await this.prisma.file.findMany({
      where: {
        workspaceId: id,
      },
      select: {
        mimeType: true,
        size: true,
      },
    });

    const stats = {
      image: { size: 0, count: 0 },
      video: { size: 0, count: 0 },
      application: { size: 0, count: 0 },
      others: { size: 0, count: 0 },
    };

    for (const file of files) {
      if (!file.mimeType) {
        continue;
      }
      const size = file.size || 0;
      if (file.mimeType.startsWith('image')) {
        stats.image.size += size;
        stats.image.count += 1;
      } else if (file.mimeType.startsWith('video')) {
        stats.video.size += size;
        stats.video.count += 1;
      } else if (file.mimeType.startsWith('application')) {
        stats.application.size += size;
        stats.application.count += 1;
      } else {
        stats.others.size += size;
        stats.others.count += 1;
      }
    }
    return [
      { title: 'Images', ...stats.image },
      { title: 'Videos', ...stats.video },
      { title: 'Documents', ...stats.application },
      { title: 'Others', ...stats.others },
    ];
  }
}
