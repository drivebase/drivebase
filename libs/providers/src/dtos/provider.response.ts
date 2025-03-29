import { Field, ObjectType } from '@nestjs/graphql';

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
