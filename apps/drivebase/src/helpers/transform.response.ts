/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  SetMetadata,
  StreamableFile,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  data: T;
}

export const SKIP_TRANSFORM_INTERCEPTOR = 'skipTransformInterceptor';
export const SkipTransformInterceptor = () =>
  SetMetadata(SKIP_TRANSFORM_INTERCEPTOR, true);

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T> | T>
{
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T> | T> {
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM_INTERCEPTOR,
      [context.getHandler(), context.getClass()],
    );

    // Skip transformation if explicitly marked
    if (skipTransform) {
      return next.handle() as Observable<T>;
    }

    return next.handle().pipe(
      map((data) => {
        // Don't transform StreamableFile responses (file downloads)
        if (data instanceof StreamableFile) {
          return data as unknown as T;
        }

        return {
          statusCode: context.switchToHttp().getResponse().statusCode,
          data: data,
        };
      }),
    );
  }
}
