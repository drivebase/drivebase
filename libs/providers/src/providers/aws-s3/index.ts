import { AuthType } from '@drivebase/providers/provider.entity';

import { ProviderRegistry } from '../../core/provider.registry';
import { ProviderCapability, ProviderType } from '../../types';
import { AwsS3Provider } from './aws-s3.provider';

// Export the provider
export * from './aws-s3.auth';
export * from './aws-s3.operations';
export * from './aws-s3.provider';

// Register the provider with the registry
ProviderRegistry.register(ProviderType.AMAZON_S3, AwsS3Provider, {
  id: 'aws-s3',
  type: ProviderType.AMAZON_S3,
  displayName: 'Amazon S3',
  description: 'Store files in Amazon S3 cloud storage',
  authType: AuthType.API_KEY,
  capabilities: [
    ProviderCapability.READ,
    ProviderCapability.WRITE,
    ProviderCapability.DELETE,
    ProviderCapability.LIST,
    ProviderCapability.SEARCH,
  ],
  configSchema: {
    fields: [
      {
        id: 'accessKeyId',
        type: 'string',
        label: 'Access Key ID',
        description: 'AWS Access Key ID',
      },
      {
        id: 'secretAccessKey',
        type: 'secret',
        label: 'Secret Access Key',
        description: 'AWS Secret Access Key',
      },
      {
        id: 'region',
        type: 'string',
        label: 'Region',
        description: 'AWS region (e.g., us-east-1)',
        default: 'us-east-1',
      },
      {
        id: 'bucket',
        type: 'string',
        label: 'Bucket Name',
        description: 'S3 bucket to use for storage',
      },
      {
        id: 'endpoint',
        type: 'string',
        label: 'Custom Endpoint',
        description: 'Optional endpoint URL for S3-compatible storage (e.g., MinIO)',
      },
    ],
    required: ['accessKeyId', 'secretAccessKey', 'bucket'],
  },
});
