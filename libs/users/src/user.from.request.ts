import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { User } from './user.entity';

export const GetUserFromRequest = createParamDecorator(
  (_, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: User }>();
    return request.user;
  },
);
