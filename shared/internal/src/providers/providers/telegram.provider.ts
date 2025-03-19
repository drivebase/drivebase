import { ApiKeyProvider, UserInfo } from '../provider.interface';
import { CustomFile } from 'telegram/client/uploads';
import { TelegramClient } from 'telegram/client/TelegramClient';
import { StringSession } from 'telegram/sessions';
import { Readable } from 'stream';

export class TelegramProvider implements ApiKeyProvider {
  client: TelegramClient;

  constructor(config: Record<string, string>) {
    this.client = new TelegramClient(
      new StringSession(config['session']),
      Number(config['apiKey']),
      config['apiHash'],
      {
        connectionRetries: 5,
      }
    );
  }

  async validateCredentials() {
    await this.client.connect();

    if (await this.client.isUserAuthorized()) {
      return true;
    }

    return false;
  }

  async getUserInfo(): Promise<UserInfo> {
    const user = await this.client.getMe();

    return {
      id: user.id.toString(),
      name: user.firstName,
      email: user.username,
    };
  }

  async uploadFile(folderId: string, file: Express.Multer.File) {
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

  async downloadFile(path: string) {
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

  async getFileMetadata() {
    throw new Error('Method `getFileMetadata` not implemented.');
  }

  async deleteFile(): Promise<boolean> {
    throw new Error('Method `deleteFile` not implemented.');
  }
}
