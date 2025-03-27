import { File } from '@drivebase/files/file.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Workspace } from './workspace.entity';
import { WorkspaceGuard } from './workspace.guard';
import { WorkspaceProvider } from './workspace.provider';
import { WorkspacesResolver } from './workspaces.resolver';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace, File])],
  providers: [
    WorkspacesService,
    WorkspaceGuard,
    WorkspaceProvider,
    WorkspacesResolver,
  ],
  exports: [WorkspacesService, WorkspaceGuard, WorkspaceProvider],
})
export class WorkspacesModule {}
