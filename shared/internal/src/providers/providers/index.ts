import { ProviderType } from '@prisma/client';

export type ProviderListItem = {
  type: ProviderType;
  label: string;
  authType: 'oauth' | 'api_key';
  inputFields: {
    [key: string]: {
      label: string;
      type: 'text' | 'password';
    };
  };
};

const oauthInputFields: ProviderListItem['inputFields'] = {
  clientId: {
    label: 'Client ID',
    type: 'text',
  },
  clientSecret: {
    label: 'Client Secret',
    type: 'password',
  },
};

export const providers: ProviderListItem[] = [
  {
    type: ProviderType.LOCAL,
    label: 'Local Storage',
    authType: 'api_key',
    inputFields: {
      basePath: {
        label: 'Storage Path (optional)',
        type: 'text',
      },
    },
  },
  {
    type: ProviderType.GOOGLE_DRIVE,
    label: 'Google Drive',
    authType: 'oauth',
    inputFields: oauthInputFields,
  },
  {
    type: ProviderType.TELEGRAM,
    label: 'Telegram',
    authType: 'api_key',
    inputFields: {
      apiKey: {
        label: 'API Key',
        type: 'text',
      },
      apiHash: {
        label: 'API Hash',
        type: 'text',
      },
      session: {
        label: 'Session',
        type: 'text',
      },
    },
  },
  {
    type: ProviderType.DROPBOX,
    label: 'Dropbox',
    authType: 'oauth',
    inputFields: oauthInputFields,
  },
  {
    type: ProviderType.AMAZON_S3,
    label: 'Amazon S3',
    authType: 'api_key',
    inputFields: {
      accessKeyId: {
        label: 'Access Key ID',
        type: 'text',
      },
      secretAccessKey: {
        label: 'Secret Access Key',
        type: 'password',
      },
      bucket: {
        label: 'Bucket',
        type: 'text',
      },
      region: {
        label: 'Region',
        type: 'text',
      },
    },
  },
  {
    type: ProviderType.ONEDRIVE,
    label: 'OneDrive',
    authType: 'oauth',
    inputFields: oauthInputFields,
  },
];
