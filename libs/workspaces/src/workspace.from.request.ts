import type { Request } from 'express';

import { ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

import { Workspace } from './workspace.entity';

export const GetWorkspaceFromRequest = createParamDecorator((_, context: ExecutionContext) => {
  const ctx = GqlExecutionContext.create(context);

  const request = ctx.getContext().req as Request & { workspace?: Workspace };

  if (!request.workspace) {
    throw new UnauthorizedException('Workspace not available.');
  }

  return request.workspace;
});
