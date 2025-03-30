import { IsEmail, IsNotEmpty, IsNumber, IsString, MinLength } from 'class-validator';

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class LoginInput {
  @Field(() => String)
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

@InputType()
export class RegisterInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field(() => String)
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

@InputType()
export class ForgotPasswordSendCodeInput {
  @Field(() => String)
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

@InputType()
export class ForgotPasswordVerifyCodeInput {
  @Field(() => String)
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Field(() => Number)
  @IsNumber()
  @IsNotEmpty()
  code: number;
}

@InputType()
export class ForgotPasswordResetInput {
  @Field(() => String)
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @Field(() => Number)
  @IsNumber()
  @IsNotEmpty()
  code: number;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}
