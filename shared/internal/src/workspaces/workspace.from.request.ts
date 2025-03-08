import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const GetWorkspaceFromRequest = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if (!request.workspace) {
      throw new UnauthorizedException(
        'Workspace not available. Make sure to use the WorkspaceGuard.'
      );
    }

    return request.workspace;
  }
);
