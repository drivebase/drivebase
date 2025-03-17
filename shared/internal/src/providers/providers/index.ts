import { ProviderType } from '@prisma/client';

export type ProviderListItem = {
  type: ProviderType;
  label: string;
  authType: 'oauth' | 'api_key' | 'custom';
};

export const providers: ProviderListItem[] = [
  {
    type: ProviderType.GOOGLE_DRIVE,
    label: 'Google Drive',
    authType: 'oauth',
  },
  {
    type: ProviderType.TELEGRAM,
    label: 'Telegram',
    authType: 'oauth',
  },
  {
    type: ProviderType.DROPBOX,
    label: 'Dropbox',
    authType: 'oauth',
  },
  {
    type: ProviderType.AMAZON_S3,
    label: 'Amazon S3',
    authType: 'api_key',
  },
  {
    type: ProviderType.ONEDRIVE,
    label: 'OneDrive',
    authType: 'oauth',
  },
];
