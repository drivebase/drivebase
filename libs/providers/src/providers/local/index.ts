import { AuthType } from '@prisma/client';

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
    fields: {
      basePath: {
        type: 'string',
        label: 'Storage Path',
        description: 'Directory path for file storage (optional)',
      },
    },
    required: [],
  },
});
