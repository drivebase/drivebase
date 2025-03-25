import { PrismaService } from '@drivebase/database/prisma.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Workspace } from '@prisma/client';
import type { Request } from 'express';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { workspace: Workspace }>();

    const cookies = request.cookies as Record<string, string>;
    const workspaceId = cookies.workspaceId || request.query['workspaceId'];

    if (!workspaceId) {
      throw new UnauthorizedException('Workspace ID is required');
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId as string },
    });

    if (!workspace) {
      throw new UnauthorizedException('Workspace not found');
    }

    request.workspace = workspace;

    return true;
  }
}
