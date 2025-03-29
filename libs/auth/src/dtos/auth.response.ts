import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LoginResponse {
  @Field(() => String)
  accessToken: string;
}

@ObjectType()
export class RegisterResponse {
  @Field(() => Boolean)
  ok: boolean;
}

@ObjectType()
export class ForgotPasswordResponse {
  @Field(() => Boolean)
  ok: boolean;
}

@ObjectType()
export class VerifyCodeResponse {
  @Field(() => Boolean)
  ok: boolean;
}
