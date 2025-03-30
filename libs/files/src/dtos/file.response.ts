import { Field, ObjectType } from '@nestjs/graphql';

import { PaginationMeta } from '@drivebase/common';

import { File } from '../file.entity';

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
