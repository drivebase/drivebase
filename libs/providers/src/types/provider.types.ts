import GraphQLJSON from 'graphql-type-json';

import { Field, registerEnumType } from '@nestjs/graphql';
import { ObjectType } from '@nestjs/graphql';

import { AuthType, ProviderType } from '../provider.entity';

export enum ProviderCapability {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  LIST = 'list',
  SEARCH = 'search',
  SHARE = 'share',
  VERSIONS = 'versions',
}

registerEnumType(ProviderCapability, {
  name: 'ProviderCapability',
});

@ObjectType()
export class ConfigurationSchema {
  @Field(() => [ConfigField])
  fields: ConfigField[];

  @Field(() => [String])
  required: string[];
}

@ObjectType()
export class ProviderMetadata {
  @Field(() => String)
  id: string;

  @Field(() => ProviderType)
  type: ProviderType;

  @Field(() => String)
  displayName: string;

  @Field(() => String)
  description: string;

  @Field(() => AuthType)
  authType: AuthType;

  @Field(() => [ProviderCapability])
  capabilities: ProviderCapability[];

  @Field(() => ConfigurationSchema)
  configSchema: ConfigurationSchema;
}

@ObjectType()
export class ConfigField {
  @Field(() => String)
  id: string;

  @Field(() => String)
  type: 'string' | 'number' | 'boolean' | 'secret';

  @Field(() => String)
  label: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  default?: string;
}

export { ProviderType };
