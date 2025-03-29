import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Provider } from '@drivebase/providers/provider.entity';
import { Workspace, WorkspacesModule } from '@drivebase/workspaces';

import { FileController } from './file.controller';
import { File } from './file.entity';
import { FilesResolver } from './files.resolver';
import { FilesService } from './files.service';

@Module({
  imports: [TypeOrmModule.forFeature([File, Provider, Workspace]), WorkspacesModule],
  controllers: [FileController],
  providers: [FilesService, FilesResolver],
  exports: [FilesService],
})
export class FilesModule {}
