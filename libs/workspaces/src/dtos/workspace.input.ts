import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateWorkspaceInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  name: string;
}

@InputType()
export class UpdateWorkspaceInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;
}
