import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class ListFilesInput {
  @Field(() => String)
  @IsString()
  @IsOptional()
  parentPath?: string;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  isStarred?: boolean;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  search?: string;

  @Field(() => Number, { nullable: true })
  @IsNumber()
  @IsOptional()
  page?: number;

  @Field(() => Number, { nullable: true })
  @IsNumber()
  @IsOptional()
  limit?: number;
}

@InputType()
export class CreateFolderInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  parentPath?: string;
}

@InputType()
export class UpdateFileInput {
  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  name?: string;

  @Field(() => Boolean, { nullable: true })
  @IsBoolean()
  @IsOptional()
  isStarred?: boolean;
}

@InputType()
export class UploadFileInput {
  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  providerId: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  path: string;
}
