import { Injectable } from '@nestjs/common';
import { File } from '@prisma/client';
import { UpdateFileDto } from './dtos/update.file.dto';
import { PrismaService } from '../prisma.service';

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
}
