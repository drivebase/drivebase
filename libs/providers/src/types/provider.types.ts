import { ProviderType } from '@prisma/client';

export enum AuthType {
  NONE = 'none',
  OAUTH2 = 'oauth2',
  API_KEY = 'api_key',
  BASIC = 'basic',
}

export enum ProviderCapability {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  LIST = 'list',
  SEARCH = 'search',
  SHARE = 'share',
  VERSIONS = 'versions',
}

export interface ProviderMetadata {
  id: string;
  type: ProviderType;
  displayName: string;
  description: string;
  authType: AuthType;
  capabilities: ProviderCapability[];
  configSchema: ConfigurationSchema;
}

export interface ConfigurationSchema {
  fields: Record<string, ConfigField>;
  required: string[];
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'secret';
  label: string;
  description?: string;
  default?: any;
}

export { ProviderType };
