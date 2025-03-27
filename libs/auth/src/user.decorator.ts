import { User } from '@drivebase/users';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext): User => {
    const ctx = GqlExecutionContext.create(context);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = ctx.getContext().req;
    const user = request.user as User;
    return user;
  },
);
