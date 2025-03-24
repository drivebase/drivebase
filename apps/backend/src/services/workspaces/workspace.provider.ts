import { Injectable } from '@nestjs/common';
import type { Workspace } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class WorkspaceProvider {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id },
    });
  }
}
