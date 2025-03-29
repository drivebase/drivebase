import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

import { Field, InputType } from '@nestjs/graphql';

import { ProviderType } from '../provider.entity';

@InputType()
export class OAuth2CredentialsInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  clientSecret: string;
}

@InputType()
export class ApiKeyCredentialsInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  apiKey: string;
}

@InputType()
export class UpdateProviderInput {
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
  isActive?: boolean;
}

@InputType()
export class UpdateProviderMetadataInput {
  @Field(() => String)
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @Field(() => String)
  @IsObject()
  @IsNotEmpty()
  metadata: Record<string, any>;
}

@InputType()
export class GetAuthUrlInput {
  @Field(() => ProviderType)
  @IsEnum(ProviderType)
  @IsNotEmpty()
  type: ProviderType;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  clientSecret: string;
}

@InputType()
export class HandleOAuthCallbackInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  state: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  code: string;
}

@InputType()
export class AuthorizeApiKeyInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  label: string;

  @Field(() => ProviderType)
  @IsEnum(ProviderType)
  @IsNotEmpty()
  type: ProviderType;

  @Field(() => GraphQLJSON)
  @IsObject()
  @IsNotEmpty()
  credentials: Record<string, any>;
}

@InputType()
export class ConnectLocalProviderInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  label: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  basePath: string;
}

@InputType()
export class ListProviderFilesInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  id: string;

  @Field(() => String, { nullable: true })
  @IsString()
  @IsOptional()
  path?: string;
}
