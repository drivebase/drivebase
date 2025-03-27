import { PrismaService } from '@drivebase/database/prisma.service';
import { ProviderFactory } from '@drivebase/providers';
import { BaseProvider } from '@drivebase/providers/core/base-provider';
import { Injectable } from '@nestjs/common';
import { File, Prisma } from '@prisma/client';

import { UpdateFileDto } from './dtos/update.file.dto';
import { UploadFileDto } from './dtos/upload.file.dto';

export type FindWorkspaceFilesQuery = {
  parentPath?: string;
  isStarred?: boolean;
  page?: number;
  limit?: number;
  search?: string;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
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

  async findAll(
    workspaceId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<PaginatedResult<File>> {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.file.findMany({
        where: {
          workspaceId,
        },
        include: {
          provider: {
            select: {
              type: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [
          {
            isFolder: 'desc', // Folders first
          },
          {
            updatedAt: 'desc', // Then by most recent update
          },
        ],
      }),
      this.prisma.file.count({
        where: {
          workspaceId,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
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
  ): Promise<PaginatedResult<File>> {
    const { page = 1, limit = 10, search, ...restQuery } = query;
    const skip = (page - 1) * limit;

    const whereClause = {} as Prisma.FileWhereInput;

    if (restQuery.isStarred) {
      whereClause.isStarred = restQuery.isStarred;
    } else if (restQuery.parentPath) {
      whereClause.parentPath = restQuery.parentPath;
    }

    whereClause.workspaceId = workspaceId;

    if (search && search.trim()) {
      whereClause.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.file.findMany({
        where: whereClause,
        include: {
          provider: {
            select: {
              type: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [
          {
            isFolder: 'desc', // Folders first
          },
          {
            createdAt: 'desc', // Then by most recent update
          },
        ],
      }),
      this.prisma.file.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
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
        provider: {
          select: {
            type: true,
          },
        },
      },
      orderBy: [
        {
          isFolder: 'desc',
        },
        {
          createdAt: 'asc',
        },
      ],
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
        id: true,
        isFolder: true,
        provider: true,
        referenceId: true,
      },
    });

    if (!file) {
      throw new Error('File not found');
    }

    if (file.isFolder) {
      return await this.deleteFolder(file.id);
    }

    if (!file.provider) {
      throw new Error('File provider not found');
    }

    const provider = ProviderFactory.createProvider(
      file.provider.type,
      file.provider.credentials as Record<string, string>,
    );

    if (!file.referenceId) {
      throw new Error('File reference ID not found');
    }

    await provider.deleteFile(file.referenceId);

    await this.prisma.file.delete({ where: { id } });
  }

  async deleteFolder(fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        path: true,
        workspaceId: true,
      },
    });

    if (!file || !file.workspaceId) {
      throw new Error('File not found');
    }

    const allChildren = await this.getAllChildren(file.path, file.workspaceId);

    for (const child of allChildren.reverse()) {
      if (!child.isFolder) {
        if (child.providerId && child.referenceId) {
          try {
            const provider = await this.prisma.provider.findUnique({
              where: { id: child.providerId },
              select: { type: true, credentials: true },
            });

            if (provider) {
              const storageProvider = ProviderFactory.createProvider(
                provider.type,
                provider.credentials as Record<string, string>,
              );
              await storageProvider.deleteFile(child.referenceId);
            }
          } catch (error) {
            console.error(
              `Failed to delete file ${child.name} from storage:`,
              error,
            );
          }
        }
      }

      await this.prisma.file.delete({ where: { id: child.id } });
    }

    await this.prisma.file.delete({ where: { id: file.id } });

    return {
      success: true,
      message: `Folder ${file.path} and all contents deleted`,
    };
  }

  private async getAllChildren(
    folderPath: string,
    workspaceId: string,
  ): Promise<File[]> {
    // Find all direct children of this path
    const children = await this.prisma.file.findMany({
      where: {
        parentPath: folderPath,
        workspaceId,
      },
      include: {
        provider: {
          select: {
            type: true,
          },
        },
      },
    });

    let allChildren: File[] = [...children];

    // Process folder children and collect their children recursively
    for (const child of children) {
      if (child.isFolder) {
        const subChildren = await this.getAllChildren(child.path, workspaceId);
        allChildren = [...allChildren, ...subChildren];
      }
    }

    return allChildren;
  }

  async downloadFile(id: string) {
    const file = await this.findById(id);

    if (!file || !file.providerId) {
      throw new Error('File not found');
    }

    const provider = await this.prisma.provider.findUnique({
      where: {
        id: file.providerId,
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

    const fileStream = await factoryProvider.downloadFile(file.referenceId);

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
        id: true,
        type: true,
        authType: true,
        credentials: true,
        metadata: true,
        workspaceId: true,
      },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    try {
      const credentials = provider.credentials as Record<string, string>;

      // Create provider instance
      const providerInstance: BaseProvider = ProviderFactory.createProvider(
        provider.type,
        credentials,
      );

      // Authenticate the provider
      await providerInstance.authenticate(credentials);

      // Upload each file
      for (const file of files) {
        const uploadedFile = await providerInstance.uploadFile(path, file);

        // Save file metadata to database
        await this.prisma.file.create({
          data: {
            name: file.originalname,
            isFolder: false,
            parentPath: path,
            path: `${path === '/' ? '' : path}/${file.originalname}`,
            mimeType: file.mimetype,
            size: file.size,
            referenceId: uploadedFile.id,
            providerId: providerId,
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
