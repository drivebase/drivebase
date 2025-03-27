import { File } from '@drivebase/files';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Workspace } from './workspace.entity';
import { WorkspaceGuard } from './workspace.guard';
import { WorkspaceProvider } from './workspace.provider';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace, File])],
  providers: [WorkspacesService, WorkspaceGuard, WorkspaceProvider],
  exports: [WorkspacesService, WorkspaceGuard, WorkspaceProvider],
})
export class WorkspacesModule {}
