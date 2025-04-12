import { ProviderType } from '@drivebase/sdk';

export const getProviderIcon = (provider: ProviderType) => {
  switch (provider) {
    case ProviderType.GoogleDrive:
      return 'https://api.iconify.design/logos/google-drive.svg';
    case ProviderType.Dropbox:
      return 'https://api.iconify.design/logos/dropbox.svg';
    case ProviderType.Telegram:
      return 'https://api.iconify.design/logos/telegram.svg';
    case ProviderType.AmazonS3:
      return 'https://api.iconify.design/logos/aws-s3.svg';
    case ProviderType.Local:
      return 'https://api.iconify.design/twemoji/laptop-computer.svg';
    case ProviderType.Darkibox:
      return 'https://darkibox.com/static/images/favicon/favicon.ico';
    default:
      return 'https://api.iconify.design/logos/google-drive.svg';
  }
};
