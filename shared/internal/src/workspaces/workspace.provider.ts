import { Injectable } from '@nestjs/common';
import { PrismaService } from '@drivebase/internal/prisma.service';
import { Workspace } from '@prisma/client';

@Injectable()
export class WorkspaceProvider {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id },
    });
  }
}
