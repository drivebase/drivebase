import { PrismaService } from '@drivebase/database/prisma.service';
import { Injectable } from '@nestjs/common';
import type { Workspace } from '@prisma/client';

@Injectable()
export class WorkspaceProvider {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id },
    });
  }
}
