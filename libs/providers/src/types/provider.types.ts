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
