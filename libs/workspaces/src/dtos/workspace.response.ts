import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class WorkspaceResponse {
  @Field(() => Boolean)
  ok: boolean;
}

@ObjectType()
export class WorkspaceStat {
  @Field(() => String)
  title: string;

  @Field(() => Number)
  count: number;

  @Field(() => Number)
  size: number;
}
