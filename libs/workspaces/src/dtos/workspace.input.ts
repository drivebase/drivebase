import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateWorkspaceInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  name: string;
}

@InputType()
export class UpdateWorkspaceInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string;
}
