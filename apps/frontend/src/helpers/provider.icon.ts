import { ProviderType } from '@prisma/client';

export const getProviderIcon = (provider: ProviderType) => {
  switch (provider) {
    case ProviderType.GOOGLE_DRIVE:
      return 'https://api.iconify.design/logos/google-drive.svg';
    case ProviderType.DROPBOX:
      return 'https://api.iconify.design/logos/dropbox.svg';
    case ProviderType.TELEGRAM:
      return 'https://api.iconify.design/logos/telegram.svg';
    case ProviderType.AMAZON_S3:
      return 'https://api.iconify.design/logos/aws-s3.svg';
    case ProviderType.ONEDRIVE:
      return 'https://api.iconify.design/logos/microsoft-onedrive.svg';
    default:
      return 'https://api.iconify.design/logos/google-drive.svg';
  }
};
