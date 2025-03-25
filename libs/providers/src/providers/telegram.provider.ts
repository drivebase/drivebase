import { Readable } from 'stream';
import { TelegramClient } from 'telegram/client/TelegramClient';
import { CustomFile } from 'telegram/client/uploads';
import { StringSession } from 'telegram/sessions';

import { ApiKeyProvider, UserInfo } from '../provider.interface';

export class TelegramProvider implements ApiKeyProvider {
  client: TelegramClient;

  constructor(config: Record<string, string>) {
    this.client = new TelegramClient(
      new StringSession(config['session']),
      Number(config['apiKey']),
      config['apiHash'],
      {
        connectionRetries: 5,
      },
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
    if (!this.client.connected) {
      await this.client.connect();
    }
    const buffer = file.buffer;
    const toUpload = new CustomFile(file.originalname, file.size, '', buffer);

    const res = await this.client.sendFile('me', {
      file: toUpload,
      forceDocument: true,
      workers: 10,
      progressCallback: (progress) => {
        console.log(progress);
      },
    });

    await this.client.disconnect();

    return `me/${res.id.toString()}`;
  }

  async downloadFile(path: string) {
    if (!this.client.connected) {
      await this.client.connect();
    }

    const [folderId, fileId] = path.split('/');

    const entity = await this.client.getEntity(folderId);

    const messages = await this.client.getMessages(entity, {
      ids: [Number(fileId)],
    });

    if (messages.length === 0) {
      throw new Error('File not found');
    }

    const message = messages[0];

    const buffer = await this.client.downloadMedia(message);

    await this.client.disconnect();

    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    return stream;
  }

  getFileMetadata() {
    return Promise.reject(
      new Error('Method `getFileMetadata` not implemented.'),
    );
  }

  deleteFile() {
    return Promise.reject(new Error('Method `deleteFile` not implemented.'));
  }

  listFiles() {
    return Promise.reject(new Error('Method `listFiles` not implemented.'));
  }
}
