import { ProviderType } from '@prisma/client';
import { DropboxProvider } from './dropbox.provider';
import { GoogleDriveProvider } from './google-drive.provider';

export type ProviderListItem = {
  type: ProviderType;
  label: string;
  logo: string;
  authType: 'oauth' | 'api_key' | 'custom';
  class: unknown;
};

export const providers: ProviderListItem[] = [
  {
    type: ProviderType.GOOGLE_DRIVE,
    label: 'Google Drive',
    logo: 'https://api.iconify.design/logos/google-drive.svg?height=16',
    class: GoogleDriveProvider,
    authType: 'oauth',
  },
  {
    type: ProviderType.TELEGRAM,
    label: 'Telegram',
    logo: 'https://api.iconify.design/logos/telegram.svg?height=16',
    class: class {},
    authType: 'custom',
  },
  {
    type: ProviderType.DROPBOX,
    label: 'Dropbox',
    logo: 'https://api.iconify.design/logos/dropbox.svg?height=16',
    class: DropboxProvider,
    authType: 'oauth',
  },
  {
    type: ProviderType.AMAZON_S3,
    label: 'Amazon S3',
    logo: 'https://api.iconify.design/logos/aws-s3.svg?height=16',
    class: class {},
    authType: 'api_key',
  },
  {
    type: ProviderType.ONEDRIVE,
    label: 'OneDrive',
    logo: 'https://api.iconify.design/logos/microsoft-onedrive.svg?height=16',
    class: class {},
    authType: 'oauth',
  },
];
