import { Injectable } from '@nestjs/common';
import type { File, Prisma } from '@prisma/client';
import { UpdateFileDto } from '@drivebase/backend/dtos/update.file.dto';
import { UploadFileDto } from '@drivebase/backend/dtos/upload.file.dto';
import {
  ApiKeyProviders,
  ProviderFactory,
} from '../providers/provider.factory';
import { ApiKeyProvider, OAuthProvider } from '../providers/provider.interface';
import { PrismaService } from '../prisma.service';

export type FindWorkspaceFilesQuery = {
  parentPath?: string;
  isStarred?: boolean;
};

@Injectable()
export class FilesService {
  constructor(private readonly prisma: PrismaService) {}

  async createFolder(workspaceId: string, name: string, parentPath = '/') {
    return this.prisma.file.create({
      data: {
        name,
        isFolder: true,
        workspaceId,
        parentPath,
        path: parentPath !== '/' ? `${parentPath}/${name}` : `/${name}`,
      },
    });
  }

  async findAll(workspaceId: string): Promise<File[]> {
    return this.prisma.file.findMany({
      where: {
        workspaceId,
      },
      include: {
        fileProvider: {
          select: {
            type: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<File | null> {
    return this.prisma.file.findUnique({
      where: {
        id,
      },
    });
  }

  async findWorkspaceFiles(
    workspaceId: string,
    query: FindWorkspaceFilesQuery,
  ) {
    const q = {} as Prisma.FileWhereInput;

    if (query.isStarred) {
      q.isStarred = query.isStarred;
    } else if (query.parentPath) {
      q.parentPath = query.parentPath;
    }

    return this.prisma.file.findMany({
      where: {
        ...q,
        workspaceId,
      },
      include: {
        fileProvider: {
          select: {
            type: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findByWorkspaceId(workspaceId: string): Promise<File[]> {
    return this.prisma.file.findMany({
      where: {
        workspaceId,
      },
    });
  }

  async findByParentPath(workspaceId: string, parentPath: string) {
    return this.prisma.file.findMany({
      where: {
        workspaceId,
        parentPath,
      },
      include: {
        fileProvider: {
          select: {
            type: true,
          },
        },
      },
    });
  }

  async update(id: string, updateFileDto: UpdateFileDto) {
    return this.prisma.file.update({
      where: {
        id,
      },
      data: updateFileDto,
    });
  }

  async delete(id: string) {
    const file = await this.prisma.file.findUnique({
      where: { id },
      select: {
        referenceId: true,
        fileProvider: {
          select: {
            type: true,
            credentials: true,
          },
        },
      },
    });

    if (!file) {
      throw new Error('File not found');
    }

    if (!file.fileProvider) {
      throw new Error('Provider not found');
    }

    const provider = ProviderFactory.createProvider(
      file.fileProvider.type,
      file.fileProvider.credentials as Record<string, string>,
    );

    if (!file.referenceId) {
      throw new Error('File reference ID not found');
    }

    await provider.deleteFile(file.referenceId);
  }

  async downloadFile(id: string) {
    const file = await this.findById(id);

    if (!file || !file.fileProviderId) {
      throw new Error('File not found');
    }

    const provider = await this.prisma.provider.findUnique({
      where: {
        id: file.fileProviderId,
      },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    if (!file.referenceId) {
      throw new Error('File reference ID not found');
    }

    const factoryProvider = ProviderFactory.createProvider(
      provider.type,
      provider.credentials as Record<string, string>,
    );

    const fileStream = await factoryProvider.downloadFile(
      file.referenceId as string,
    );

    const metadata = {
      fileName: file.name,
      mimeType: file.mimeType,
      size: file.size,
    };

    return { fileStream, metadata };
  }

  // todo(v2): Add queue for each file using BullMQ
  async uploadFile(files: Express.Multer.File[], payload: UploadFileDto) {
    const { providerId, path } = payload;
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        type: true,
        credentials: true,
        metadata: true,
        workspaceId: true,
      },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    const metadata = (provider.metadata || {}) as Record<string, string>;

    try {
      const credentials = provider.credentials as Record<string, string>;
      let providerInstance: ApiKeyProvider | OAuthProvider;

      if (ApiKeyProviders.includes(provider.type)) {
        providerInstance = ProviderFactory.createApiKeyProvider(
          provider.type,
          credentials,
        );
      } else {
        providerInstance = ProviderFactory.createOAuthProvider(
          provider.type,
          credentials,
        );
      }

      await providerInstance.validateCredentials();

      for (const file of files) {
        let folderId = '';

        if ('hasFolder' in providerInstance) {
          const folder = await providerInstance.hasFolder(metadata['folderId']);

          if (metadata['folderId']) {
            folderId = metadata['folderId'];
          }

          if (!folder) {
            const folderId = await providerInstance.createDrivebaseFolder();

            await this.prisma.provider.update({
              where: { id: providerId },
              data: {
                metadata: {
                  folderId,
                },
              },
            });

            metadata['folderId'] = folderId;
          }
        }

        const reference = await providerInstance.uploadFile(folderId, file);

        await this.prisma.file.create({
          data: {
            name: file.originalname,
            isFolder: false,
            parentPath: path,
            path: `${path === '/' ? '' : path}/${file.originalname}`,
            mimeType: file.mimetype,
            size: file.size,
            referenceId: reference,
            fileProviderId: providerId,
            workspaceId: provider.workspaceId,
          },
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to upload file: ${errorMessage}`);
    }
  }

  async starFile(id: string) {
    return this.prisma.file.update({
      where: { id },
      data: { isStarred: true },
    });
  }

  async unstarFile(id: string) {
    return this.prisma.file.update({
      where: { id },
      data: { isStarred: false },
    });
  }
}
