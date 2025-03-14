import { Injectable } from '@nestjs/common';
import { File } from '@prisma/client';
import { UpdateFileDto } from './dtos/update.file.dto';
import { PrismaService } from '../prisma.service';
import { UploadFileDto } from './dtos/upload.file.dto';
import { ProviderFactory } from '../providers/provider.factory';

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
    });
  }

  async findById(id: string): Promise<File | null> {
    return this.prisma.file.findUnique({
      where: {
        id,
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
    const file = await this.findById(id);

    if (!file) {
      throw new Error('File not found');
    }

    const account = await this.prisma.account.findFirst({
      where: {
        workspaceId: file.workspaceId,
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const provider = ProviderFactory.createProvider(
      account.type,
      account.credentials as Record<string, string>
    );

    await provider.deleteFile(file.reference as string);
  }

  // todo(v2): Add queue for each file using BullMQ
  async uploadFile(files: Express.Multer.File[], uploadFileDto: UploadFileDto) {
    const { accountId, path } = uploadFileDto;

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        type: true,
        credentials: true,
        workspaceId: true,
        folderId: true,
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const keys = await this.prisma.key.findFirst({
      where: {
        workspaceId: account.workspaceId,
        type: account.type,
      },
    });

    if (!keys) {
      throw new Error('Keys not found');
    }

    try {
      const provider = ProviderFactory.createProvider(
        account.type,
        keys.keys as Record<string, string>
      );

      const credentials = account.credentials as Record<string, string>;

      provider.setCredentials(credentials);

      for (const file of files) {
        const folder = await provider.hasFolder(account.folderId);

        if (!folder) {
          const folderId = await provider.createDrivebaseFolder();

          await this.prisma.account.update({
            where: { id: account.id },
            data: {
              folderId,
            },
          });
        }

        const reference = await provider.uploadFile(account.folderId, file);

        await this.prisma.file.create({
          data: {
            reference,
            name: file.originalname,
            isFolder: false,
            parentPath: path,
            path: `${path === '/' ? '' : path}/${file.originalname}`,
            mimeType: file.mimetype,
            workspaceId: account.workspaceId,
            provider: account.type,
            size: file.size,
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
}
