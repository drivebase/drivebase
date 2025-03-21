import { Injectable } from '@nestjs/common';
import { Workspace } from '@prisma/client';
import { PrismaService } from '@drivebase/internal/prisma.service';
import { CreateWorkspaceDto } from './dtos/create.workspace.dto';
import { UpdateWorkspaceDto } from './dtos/update.workspace.dto';

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
}
