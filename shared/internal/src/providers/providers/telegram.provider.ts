import { ProviderType } from '@prisma/client';
import { OAuthConfig } from '../provider.interface';
import { BaseProvider } from './base.provider';
import { CustomFile } from 'telegram/client/uploads';
import { TelegramClient } from 'telegram/client/TelegramClient';
import { StringSession } from 'telegram/sessions';
import { Readable } from 'stream';

export class TelegramProvider extends BaseProvider {
  client: TelegramClient;

  constructor(config: OAuthConfig) {
    super(config);
  }

  override async setCredentials(credentials: Record<string, string>) {
    this.client = new TelegramClient(
      new StringSession(credentials['session']),
      Number(this.config.clientId),
      this.config.clientSecret,
      {
        connectionRetries: 5,
      }
    );

    await this.client.connect();
  }

  override getAuthUrl(): string {
    return `custom://${ProviderType.TELEGRAM}`;
  }

  override async hasFolder(id: string): Promise<boolean> {
    return true;
  }

  override async uploadFile(folderId: string, file: Express.Multer.File) {
    const buffer = file.buffer;
    const toUpload = new CustomFile(file.originalname, file.size, '', buffer);

    const entity = await this.client.getEntity(folderId);

    const res = await this.client.sendFile(entity, {
      file: toUpload,
      forceDocument: true,
      workers: 10,
      progressCallback: (progress) => {
        console.log(progress);
      },
    });

    await this.client.disconnect();

    return `${folderId}/${res.id.toString()}`;
  }

  override async downloadFile(path: string) {
    const [folderId, fileId] = path.split('/');

    const entity = await this.client.getEntity(folderId);

    const message = await this.client.getMessages(entity, {
      ids: [Number(fileId)],
    });

    console.log('message', message);

    const emptyBuffer = Buffer.from([]);

    await this.client.disconnect();

    return new Readable({
      read() {
        this.push(emptyBuffer);
      },
    });
  }
}
