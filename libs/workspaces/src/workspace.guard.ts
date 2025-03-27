import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';

import { Workspace } from './workspace.entity';

@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { workspace: Workspace }>();

    const cookies = request.cookies as Record<string, string>;
    const workspaceId = cookies.workspaceId || request.query['workspaceId'];

    if (!workspaceId) {
      throw new UnauthorizedException('Workspace ID is required');
    }

    const workspace = await this.workspaceRepository.findOne({
      where: { id: workspaceId as string },
    });

    if (!workspace) {
      throw new UnauthorizedException('Workspace not found');
    }

    request.workspace = workspace;

    return true;
  }
}
