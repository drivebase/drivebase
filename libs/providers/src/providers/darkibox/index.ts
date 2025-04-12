import { AuthType } from '@drivebase/providers/provider.entity';

import { ProviderRegistry } from '../../core/provider.registry';
import { ProviderCapability, ProviderType } from '../../types';
import { DarkiboxProvider } from './darkibox.provider';

// Export the provider
export * from './darkibox.auth';
export * from './darkibox.operations';
export * from './darkibox.provider';
// This would normally be done in the ProviderType enum in the types file

// Register the provider with the registry
ProviderRegistry.register(ProviderType.DARKIBOX, DarkiboxProvider, {
  id: 'darkibox',
  type: ProviderType.DARKIBOX,
  displayName: 'Darkibox',
  description: 'Connect to Darkibox to store and access files',
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
        id: 'apiKey',
        type: 'secret',
        label: 'API Key',
        description: 'API Key from Darkibox',
      },
      {
        id: 'endpoint',
        type: 'string',
        label: 'Endpoint (optional)',
        description: 'Endpoint for Darkibox',
      },
    ],
    required: ['apiKey'],
  },
});
