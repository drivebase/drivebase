import type { Request } from 'express';
import { Repository } from 'typeorm';

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';

import { Workspace } from './workspace.entity';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const request = ctx.getContext().req as Request & { workspace: Workspace };

    const cookies = request.cookies as Record<string, string>;
    const workspaceId = cookies.workspaceId || request.headers['x-workspace-id'];

    if (!workspaceId) {
      throw new ForbiddenException('Workspace ID is required');
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId as string },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    request.workspace = workspace;

    return true;
  }
}
