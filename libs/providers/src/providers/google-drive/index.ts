import { AuthType } from '@drivebase/providers/provider.entity';

import { ProviderRegistry } from '../../core/provider.registry';
import { ProviderCapability, ProviderType } from '../../types';
import { GoogleDriveProvider } from './google-drive.provider';

// Export the provider
export * from './google-drive.auth';
export * from './google-drive.operations';
export * from './google-drive.provider';

// Register the provider with the registry
ProviderRegistry.register(ProviderType.GOOGLE_DRIVE, GoogleDriveProvider, {
  id: 'google-drive',
  type: ProviderType.GOOGLE_DRIVE,
  displayName: 'Google Drive',
  description: 'Connect to Google Drive to store and access files',
  authType: AuthType.OAUTH2,
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
        id: 'clientId',
        type: 'string',
        label: 'Client ID',
        description: 'OAuth Client ID from Google Cloud Console',
      },
      {
        id: 'clientSecret',
        type: 'secret',
        label: 'Client Secret',
        description: 'OAuth Client Secret from Google Cloud Console',
      },
    ],
    required: ['clientId', 'clientSecret'],
  },
});
