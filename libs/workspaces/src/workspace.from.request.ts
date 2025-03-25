import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Workspace } from '@prisma/client';
import type { Request } from 'express';

export const GetWorkspaceFromRequest = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { workspace: Workspace }>();

    if (!request.workspace) {
      throw new UnauthorizedException('Workspace not available.');
    }

    return request.workspace;
  },
);
