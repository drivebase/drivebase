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
    type: 'Telegram',
    label: 'Telegram',
    logo: 'https://api.iconify.design/logos/telegram.svg?height=16',
    class: class {},
  },
  {
    type: ProviderType.DROPBOX,
    label: 'Dropbox',
    logo: 'https://api.iconify.design/logos/dropbox.svg?height=16',
    class: DropboxProvider,
  },
  {
    type: 'Box',
    label: 'Box',
    logo: 'https://api.iconify.design/logos/box.svg?height=16',
    class: class {},
  },
  {
    type: 'AmazonS3',
    label: 'Amazon S3',
    logo: 'https://api.iconify.design/logos/aws-s3.svg?height=16',
    class: class {},
  },
  {
    type: 'OneDrive',
    label: 'OneDrive',
    logo: 'https://api.iconify.design/logos/microsoft-onedrive.svg?height=16',
    class: class {},
  },
];
