import { PrismaService } from '@drivebase/internal/prisma.service';
import { Injectable } from '@nestjs/common';
import { telegramSessions } from './telegram.session';
import { ProviderType } from '@prisma/client';
import { StringSession } from 'telegram/sessions';
import { Api, TelegramClient } from 'telegram';

const drivebaseFolderName = process.env['DRIVEBASE_FOLDER_NAME'] ?? 'Drivebase';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const resolvers = new Map<string, Function>();

const genKey = (phoneNumber: string, key: string) => `${phoneNumber}:${key}`;

function resolveResponse(key: string, message?: Record<string, unknown>) {
  const responseResolver = resolvers.get(genKey(key, 'response'));
  if (responseResolver) {
    responseResolver(message);
  }
}

function createResponseResolver(key: string) {
  return new Promise<Record<string, string>>((resolve) => {
    resolvers.set(genKey(key, 'response'), resolve);
  });
}

@Injectable()
export class TelegramService {
  constructor(private readonly prisma: PrismaService) {}

  async sendCode(workspaceId: string, phoneNumber: string) {
    const keys = await this.prisma.key.findMany({
      where: {
        workspaceId,
        type: ProviderType.TELEGRAM,
      },
    });

    if (keys.length === 0) {
      throw new Error('No keys found');
    }

    const key = keys[0];

    const credentials = key.keys as {
      clientId: string;
      clientSecret: string;
    };

    try {
      const client = new TelegramClient(
        new StringSession(''),
        Number(credentials.clientId),
        credentials.clientSecret,
        { connectionRetries: 5 }
      );

      telegramSessions.set(workspaceId, client);

      client
        .start({
          phoneNumber,
          phoneCode: async () => {
            return new Promise((resolve) => {
              resolvers.set(genKey(workspaceId, 'phoneCode'), resolve);
              resolveResponse(workspaceId);
            });
          },
          password: async () => {
            return new Promise((resolve) => {
              resolvers.set(genKey(workspaceId, 'password'), resolve);
              resolveResponse(workspaceId, {
                next: 'require_password',
              });
            });
          },
          onError: (error) => {
            console.error(error);
          },
        })
        .then(async () => {
          const client = telegramSessions.get(workspaceId);
          if (!client) {
            throw new Error('Client not found');
          }
          const me = await client.getMe();
          if (me) {
            try {
              const result = await client.invoke(
                new Api.channels.CreateChannel({
                  title: drivebaseFolderName,
                  about: 'Drivebase Private Space',
                  broadcast: false,
                  megagroup: false,
                })
              );

              let channelId = '';

              const session = client.session.save() as unknown as string;

              if (result.className === 'Updates') {
                for (const update of result.updates) {
                  if (update.className === 'UpdateNewChannelMessage') {
                    if (
                      update.originalArgs.message.className === 'MessageService'
                    ) {
                      channelId =
                        update.originalArgs.message.senderId.toString();
                    }
                  }
                }

                if (channelId) {
                  await this.prisma.account.create({
                    data: {
                      workspaceId,
                      type: ProviderType.TELEGRAM,
                      folderId: channelId,
                      userInfo: {
                        id: me.id,
                        firstName: me.firstName,
                      },
                      credentials: {
                        session,
                        phoneNumber,
                      },
                      alias: me.firstName,
                    },
                  });
                  resolveResponse(workspaceId, {
                    id: me.id,
                    firstName: me.firstName,
                  });
                  return;
                }
              }

              resolveResponse(workspaceId, {
                error: 'Failed to create channel',
              });
            } catch (err) {
              console.error(err);
            }

            // const session = client.session.save();
            // const account = await this.prisma.account.create({
            //   data: {

            //   }
            // })
          } else {
            resolveResponse(workspaceId, {
              error: 'Failed to get user info',
            });
          }
        });

      return createResponseResolver(workspaceId);
    } catch (err) {
      console.error(err);
      throw err;
    }
  }

  async verifyCode(workspaceId: string, code: string) {
    const client = telegramSessions.get(workspaceId);
    if (!client) {
      throw new Error('Client not found');
    }
    const resolver = resolvers.get(genKey(workspaceId, 'phoneCode'));
    if (resolver) {
      resolver(code);
    }
    return createResponseResolver(workspaceId);
  }

  async verifyPassword(workspaceId: string, password: string) {
    const client = telegramSessions.get(workspaceId);
    if (!client) {
      throw new Error('Client not found');
    }
    const resolver = resolvers.get(genKey(workspaceId, 'password'));
    if (resolver) {
      resolver(password);
    }
    return createResponseResolver(workspaceId);
  }
}
