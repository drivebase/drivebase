import { ProviderType } from '@prisma/client';
import { OAuthProvider } from './provider.interface';
import { GoogleDriveProvider } from './providers/google-drive.provider';
// import { DropboxProvider } from './providers/dropbox.provider';

export class ProviderFactory {
  static createProvider(
    type: ProviderType,
    config: Record<string, string>
  ): OAuthProvider {
    switch (type) {
      case ProviderType.GOOGLE_DRIVE:
        return new GoogleDriveProvider({
          clientId: config['clientId'],
          clientSecret: config['clientSecret'],
        });
      // case ProviderType.DROPBOX:
      // return new DropboxProvider({
      //   clientId: config['clientId'],
      //   clientSecret: config['clientSecret'],
      // });
      default:
        throw new Error(`Provider type ${type} is not supported`);
    }
  }
}
