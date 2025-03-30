import { Field, ObjectType } from '@nestjs/graphql';

import { PaginationMeta } from '@drivebase/common';

import { FileMetadata } from '../types/operations.types';

@ObjectType()
export class ProviderResponse {
  @Field(() => Boolean)
  ok: boolean;
}

@ObjectType()
export class AuthUrlResponse {
  @Field(() => String)
  url: string;
}

@ObjectType()
export class ListProviderFilesResponse {
  @Field(() => [FileMetadata])
  data: FileMetadata[];

  @Field(() => PaginationMeta)
  meta: PaginationMeta;
}
