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
    if (parentPath) {
      await this.prisma.file.updateMany({
        where: { path: parentPath },
        data: {
          totalItems: { increment: 1 },
        },
      });
    }

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
    return this.prisma.file.delete({
      where: {
        id,
      },
    });
  }

  // todo(v2): Add queue for each file using BullMQ
  async uploadFile(files: Express.Multer.File[], uploadFileDto: UploadFileDto) {
    const { accountId, path } = uploadFileDto;

    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: {
        type: true,
        credentials: true,
        workspace: { select: { id: true } },
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const keys = await this.prisma.key.findFirst({
      where: {
        workspaceId: account.workspace.id,
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

      provider.setCredentials({
        access_token: credentials['accessToken'],
        refresh_token: credentials['refreshToken'],
      });

      for (const file of files) {
        const upload = await provider.uploadFile(path, file);

        await this.prisma.file.create({
          data: {
            name: file.originalname,
            isFolder: false,
            parentPath: path,
            path: `${path}/${file.originalname}`,
            size: file.size,
            mimeType: file.mimetype,
            workspaceId: account.workspace.id,
            reference: upload,
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
