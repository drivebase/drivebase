import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Workspace } from './workspace.entity';

@Injectable()
export class WorkspaceProvider {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
  ) {}

  async findById(id: string): Promise<Workspace | null> {
    return this.workspaceRepository.findOne({
      where: { id },
    });
  }
}
