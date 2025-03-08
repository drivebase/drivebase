import { ProviderType } from '@prisma/client';
import { DropboxProvider } from './dropbox.provider';
import { GoogleDriveProvider } from './google-drive.provider';

export const providers = [
  {
    type: ProviderType.GOOGLE_DRIVE,
    label: 'Google Drive',
    logo: 'https://api.iconify.design/logos/google-drive.svg?height=16',
    class: GoogleDriveProvider,
  },
  {
    type: ProviderType.DROPBOX,
    label: 'Dropbox',
    logo: 'https://api.iconify.design/logos/dropbox.svg?height=16',
    class: DropboxProvider,
  },
];
