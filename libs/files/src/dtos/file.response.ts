import { Field, ObjectType } from '@nestjs/graphql';

import { File } from '../file.entity';

@ObjectType()
export class PaginationMeta {
  @Field(() => Number)
  total: number;

  @Field(() => Number)
  page: number;

  @Field(() => Number)
  limit: number;

  @Field(() => Number)
  totalPages: number;
}

@ObjectType()
export class PaginatedFilesResponse {
  @Field(() => [File])
  data: File[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}

@ObjectType()
export class OkResponse {
  @Field(() => Boolean)
  ok: boolean;
}
