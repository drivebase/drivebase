import { File } from '@drivebase/files/file.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateWorkspaceDto } from './dtos/create.workspace.dto';
import { UpdateWorkspaceDto } from './dtos/update.workspace.dto';
import { WorkspaceStatDto } from './dtos/workspace.stats.dto';
import { Workspace } from './workspace.entity';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
  ) {}

  async create(
    ownerId: string,
    createWorkspaceDto: CreateWorkspaceDto,
  ): Promise<Workspace> {
    const workspace = this.workspaceRepository.create({
      name: createWorkspaceDto.name,
      ownerId,
    });
    return this.workspaceRepository.save(workspace);
  }

  async findAll(): Promise<Workspace[]> {
    return this.workspaceRepository.find();
  }

  async findByUserId(ownerId: string): Promise<Workspace[]> {
    return this.workspaceRepository.find({
      where: { ownerId },
    });
  }

  async findById(id: string): Promise<Workspace | null> {
    return this.workspaceRepository.findOne({
      where: { id },
    });
  }

  async update(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
  ): Promise<void> {
    await this.workspaceRepository.update(id, updateWorkspaceDto);
  }

  async delete(id: string): Promise<void> {
    await this.workspaceRepository.delete(id);
  }

  async getWorkspaceWithProviders(id: string) {
    return this.workspaceRepository.findOne({
      where: { id },
      relations: {
        providers: true,
      },
    });
  }

  async getWorkspaceStats(id: string): Promise<WorkspaceStatDto[]> {
    const files = await this.fileRepository.find({
      where: {
        workspaceId: id,
      },
      select: {
        mimeType: true,
        size: true,
      },
    });

    const stats = {
      image: { size: 0, count: 0 },
      video: { size: 0, count: 0 },
      application: { size: 0, count: 0 },
      others: { size: 0, count: 0 },
    };

    for (const file of files) {
      if (!file.mimeType) {
        continue;
      }
      const size = file.size || 0;
      if (file.mimeType.startsWith('image')) {
        stats.image.size += size;
        stats.image.count += 1;
      } else if (file.mimeType.startsWith('video')) {
        stats.video.size += size;
        stats.video.count += 1;
      } else if (file.mimeType.startsWith('application')) {
        stats.application.size += size;
        stats.application.count += 1;
      } else {
        stats.others.size += size;
        stats.others.count += 1;
      }
    }
    return [
      { title: 'Images', ...stats.image },
      { title: 'Videos', ...stats.video },
      { title: 'Documents', ...stats.application },
      { title: 'Others', ...stats.others },
    ];
  }
}
