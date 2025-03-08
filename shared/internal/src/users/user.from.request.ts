import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUserFromRequest = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
