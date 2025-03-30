import type { Request } from 'express';

import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { User } from './user.entity';

export const GetUserFromRequest = createParamDecorator((_, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request & { user: User }>();
  return request.user;
});
