import { FindOptionsWhere, ILike, Like, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { IPaginatedResult } from '@drivebase/common';
import { ProviderFactory } from '@drivebase/providers';
import { Provider } from '@drivebase/providers/provider.entity';
import { WorkspacesService } from '@drivebase/workspaces';

import { ListFilesInput } from './dtos/file.input';
import { PaginatedFilesResponse } from './dtos/file.response';
import { UpdateFileDto } from './dtos/update.file.dto';
import { UploadFileDto } from './dtos/upload.file.dto';
import { File } from './file.entity';
import { PaginatedResult } from './types';

export type FindWorkspaceFilesQuery = {
  parentPath?: string;
  isStarred?: boolean;
  page?: number;
  limit?: number;
  search?: string;
};

type SignedUrlData = {
  expiresAt: Date;
  workspaceId: string;
};

@Injectable()
export class FilesService {
  uploadKeys: Map<string, SignedUrlData> = new Map();

  constructor(
    private readonly workspaceService: WorkspacesService,

    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    // TODO: Move to a provider service
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
  ) {}

  async createFolder(workspaceId: string, name: string, parentPath = '/') {
    const file = this.fileRepository.create({
      name,
      isFolder: true,
      workspaceId,
      parentPath,
      path: parentPath !== '/' ? `${parentPath}/${name}` : `/${name}`,
    });
    return this.fileRepository.save(file);
  }

  async findAll(
    where: FindOptionsWhere<File>,
    options: { page?: number; limit?: number } = {},
  ): Promise<IPaginatedResult<File>> {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.fileRepository.find({
        where,
        relations: {
          provider: true,
        },
        skip,
        take: limit,
        order: {
          isFolder: 'DESC',
          updatedAt: 'DESC',
        },
      }),
      this.fileRepository.count({
        where,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        hasMore: total > skip + limit,
        totalPages,
      },
    };
  }

  async findById(id: string): Promise<File | null> {
    return this.fileRepository.findOne({
      where: { id },
    });
  }

  async getFiles(workspaceId: string, query: ListFilesInput): Promise<PaginatedFilesResponse> {
    const whereClause: FindOptionsWhere<File> = { workspaceId };

    if (query.isStarred) {
      whereClause.isStarred = query.isStarred;
    }

    if (query.search) {
      whereClause.name = ILike(`%${query.search}%`);
    } else {
      if (query.parentPath) {
        whereClause.parentPath = query.parentPath;
      }
    }

    return this.findAll(whereClause, {
      page: query.page || 1,
      limit: query.limit,
    });
  }

  async findWorkspaceFiles(
    workspaceId: string,
    query: FindWorkspaceFilesQuery,
  ): Promise<PaginatedResult<File>> {
    const { page = 1, limit = 10, search, ...restQuery } = query;
    const skip = (page - 1) * limit;

    const whereClause: FindOptionsWhere<File> = { workspaceId };

    if (restQuery.isStarred) {
      whereClause.isStarred = restQuery.isStarred;
    } else if (restQuery.parentPath) {
      whereClause.parentPath = restQuery.parentPath;
    }

    if (search && search.trim()) {
      whereClause.name = ILike(`%${search.trim()}%`);
    }

    const [data, total] = await Promise.all([
      this.fileRepository.find({
        where: whereClause,
        relations: {
          provider: true,
        },
        skip,
        take: limit,
        order: {
          isFolder: 'DESC',
          createdAt: 'DESC',
        },
      }),
      this.fileRepository.count({
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
    return this.fileRepository.find({
      where: {
        workspaceId,
      },
    });
  }

  async findByParentPath(workspaceId: string, parentPath: string) {
    return this.fileRepository.find({
      where: {
        workspaceId,
        parentPath,
      },
      relations: {
        provider: true,
      },
      order: {
        isFolder: 'DESC',
        createdAt: 'ASC',
      },
    });
  }

  async update(id: string, updateFileDto: UpdateFileDto) {
    await this.fileRepository.update(id, updateFileDto);
  }

  async delete(id: string) {
    const file = await this.fileRepository.findOne({
      where: { id },
      relations: { provider: true },
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

    await this.fileRepository.delete(id);
  }

  async deleteFolder(fileId: string) {
    const file = await this.fileRepository.findOne({
      where: { id: fileId },
      select: {
        id: true,
        path: true,
        workspaceId: true,
      },
    });

    if (!file || !file.path || !file.workspaceId) {
      throw new Error('Folder not found');
    }

    // Get all child files and folders
    const children = await this.getAllChildren(file.path, file.workspaceId);

    // Delete files from providers
    const providerFiles = children.filter(
      (child) => !child.isFolder && child.providerId && child.referenceId,
    );

    for (const providerFile of providerFiles) {
      try {
        if (providerFile.providerId && providerFile.referenceId) {
          const provider = await this.providerRepository.findOne({
            where: { id: providerFile.providerId },
          });

          if (provider) {
            const providerInstance = ProviderFactory.createProvider(
              provider.type,
              provider.credentials as Record<string, string>,
            );
            await providerInstance.deleteFile(providerFile.referenceId);
          }
        }
      } catch (error) {
        console.error(`Error deleting provider file: ${error.message}`);
      }
    }

    // Delete all child files and folders from database
    for (const child of children) {
      await this.fileRepository.delete(child.id);
    }

    // Delete the folder itself
    await this.fileRepository.delete(fileId);
  }

  private async getAllChildren(folderPath: string, workspaceId: string): Promise<File[]> {
    if (!folderPath) {
      return [];
    }

    // Find all files that have a path that starts with the folder path
    const files = await this.fileRepository.find({
      where: {
        workspaceId,
        path: Like(`${folderPath}%`),
      },
    });

    return files;
  }

  async downloadFile(id: string) {
    const file = await this.fileRepository.findOne({
      where: { id },
      relations: { provider: true },
    });

    if (!file) {
      throw new Error('File not found');
    }

    if (file.isFolder) {
      throw new Error('Cannot download a folder');
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

    await provider.authenticate(file.provider.credentials as Record<string, string>);

    const metadata = await provider.getFileMetadata(file.referenceId);
    const stream = await provider.downloadFile(file.referenceId);

    return {
      metadata,
      stream,
    };
  }

  async uploadFile(files: Express.Multer.File[], payload: UploadFileDto, key: string) {
    const { providerId } = payload;

    const uploadKey = this.uploadKeys.get(key);

    if (!uploadKey) {
      throw new Error('Invalid upload key');
    }

    if (uploadKey.expiresAt < new Date()) {
      throw new Error('Upload key expired');
    }

    if (!providerId) {
      throw new Error('Provider ID is required');
    }

    const provider = await this.providerRepository.findOne({
      where: { id: providerId },
    });

    if (!provider) {
      throw new Error('Provider not found');
    }

    if (uploadKey.workspaceId !== provider.workspaceId) {
      throw new Error('Upload key does not match workspace');
    }

    const providerInstance = ProviderFactory.createProvider(
      provider.type,
      provider.credentials as Record<string, string>,
    );

    await providerInstance.authenticate(provider.credentials as Record<string, string>);

    const uploadedFiles: File[] = [];

    for (const file of files) {
      const uploadResult = await providerInstance.uploadFile(payload.path, {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });

      if (!uploadResult || !uploadResult.id) {
        throw new Error('Failed to upload file to provider');
      }

      const newFile = this.fileRepository.create({
        name: file.originalname,
        isFolder: false,
        path: uploadResult.path,
        parentPath: payload.path,
        providerId,
        mimeType: file.mimetype,
        size: file.size,
        referenceId: uploadResult.id,
        workspaceId: provider.workspaceId,
      });

      const savedFile = await this.fileRepository.save(newFile);
      uploadedFiles.push(savedFile);
    }

    return uploadedFiles;
  }

  async starFile(id: string) {
    await this.fileRepository.update(id, { isStarred: true });
  }

  async unstarFile(id: string) {
    await this.fileRepository.update(id, { isStarred: false });
  }

  async generateUploadKey(workspaceId: string) {
    const workspace = await this.workspaceService.findById(workspaceId);

    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const uploadKey = uuidv4();

    this.uploadKeys.set(uploadKey, {
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      workspaceId,
    });

    return uploadKey;
  }
}
