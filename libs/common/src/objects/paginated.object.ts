import { Type as ClassTransformerType } from 'class-transformer';
import { ValidateNested } from 'class-validator';

import { Type } from '@nestjs/common';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PaginationMeta {
  /**
   * Total number of items (if available)
   */
  @Field(() => Number, { nullable: true })
  total?: number;

  /**
   * Total number of pages (if available)
   */
  @Field(() => Number, { nullable: true })
  totalPages?: number;

  /**
   * Current page number (if available)
   */
  @Field(() => Number, { nullable: true })
  page?: number;

  /**
   * Next page cursor (if available)
   */
  @Field(() => String, { nullable: true })
  nextCursor?: string;

  /**
   * Previous page cursor (if available)
   */
  @Field(() => String, { nullable: true })
  prevCursor?: string;

  /**
   * Whether there are more items
   */
  @Field(() => Boolean)
  hasMore: boolean;
}

// Generic interface for type safety
export interface IPaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// Base abstract class
@ObjectType({ isAbstract: true })
export abstract class PaginatedResult<T> implements IPaginatedResult<T> {
  abstract data: T[];

  @Field(() => PaginationMeta)
  @ValidateNested()
  @ClassTransformerType(() => PaginationMeta)
  meta: PaginationMeta;
}

// Factory function to create concrete paginated result class
export function createPaginatedResult<T>(ItemType: Type<T>) {
  @ObjectType({ isAbstract: true })
  class PaginatedType extends PaginatedResult<T> {
    @Field(() => [ItemType])
    @ValidateNested({ each: true })
    @ClassTransformerType(() => ItemType)
    override data: T[] = [];
  }

  return PaginatedType;
}
