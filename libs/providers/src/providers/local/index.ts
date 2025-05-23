import { AuthType } from '@drivebase/providers/provider.entity';

import { ProviderRegistry } from '../../core/provider.registry';
import { ProviderCapability, ProviderType } from '../../types';
import { LocalProvider } from './local.provider';

// Export the provider
export * from './local.auth';
export * from './local.provider';

// Register the provider with the registry
ProviderRegistry.register(ProviderType.LOCAL, LocalProvider, {
  id: 'local',
  type: ProviderType.LOCAL,
  displayName: 'Local Storage',
  description: 'Store files on the local filesystem',
  authType: AuthType.NONE,
  capabilities: [
    ProviderCapability.READ,
    ProviderCapability.WRITE,
    ProviderCapability.DELETE,
    ProviderCapability.LIST,
  ],
  configSchema: {
    fields: [
      {
        id: 'basePath',
        type: 'string',
        label: 'Storage Path (optional)',
        description: 'Directory path for file storage (optional)',
      },
    ],
    required: [],
  },
});
