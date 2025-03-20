import type { ProviderType } from '@prisma/client';

export const getProviderIcon = (provider: ProviderType) => {
  switch (provider) {
    case 'GOOGLE_DRIVE':
      return 'https://api.iconify.design/logos/google-drive.svg';
    case 'DROPBOX':
      return 'https://api.iconify.design/logos/dropbox.svg';
    case 'TELEGRAM':
      return 'https://api.iconify.design/logos/telegram.svg';
    case 'AMAZON_S3':
      return 'https://api.iconify.design/logos/aws-s3.svg';
    case 'ONEDRIVE':
      return 'https://api.iconify.design/logos/microsoft-onedrive.svg';
    case 'LOCAL':
      return 'https://api.iconify.design/twemoji/laptop-computer.svg';
    default:
      return 'https://api.iconify.design/logos/google-drive.svg';
  }
};
