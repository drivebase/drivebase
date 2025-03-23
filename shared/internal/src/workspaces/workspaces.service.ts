import { Injectable } from '@nestjs/common';
import { Workspace } from '@prisma/client';
import { PrismaService } from '@drivebase/internal/prisma.service';
import { CreateWorkspaceDto } from './dtos/create.workspace.dto';
import { UpdateWorkspaceDto } from './dtos/update.workspace.dto';
import { WorkspaceStats } from '../types/workspace.types';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: string,
    createWorkspaceDto: CreateWorkspaceDto
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
    updateWorkspaceDto: UpdateWorkspaceDto
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

  async getWorkspaceStats(id: string): Promise<WorkspaceStats> {
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
      if (file.mimeType.startsWith('image')) {
        stats.image.size += file.size;
        stats.image.count += 1;
      } else if (file.mimeType.startsWith('video')) {
        stats.video.size += file.size;
        stats.video.count += 1;
      } else if (file.mimeType.startsWith('application')) {
        stats.application.size += file.size;
        stats.application.count += 1;
      } else {
        stats.others.size += file.size;
        stats.others.count += 1;
      }
    }
    return stats;
  }
}
