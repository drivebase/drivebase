import { ProviderType } from '@prisma/client';
import { Provider, ProviderConfig } from './provider.interface';
import { GoogleDriveProvider } from './providers/google-drive.provider';
import { DropboxProvider } from './providers/dropbox.provider';

export class ProviderFactory {
  static createProvider(type: ProviderType, config: ProviderConfig): Provider {
    switch (type) {
      case ProviderType.GOOGLE_DRIVE:
        return new GoogleDriveProvider(config);
      case ProviderType.DROPBOX:
        return new DropboxProvider(config);
      default:
        throw new Error(`Provider type ${type} is not supported`);
    }
  }
}
