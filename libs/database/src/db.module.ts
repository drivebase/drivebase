import { FilesService } from '@drivebase/files';
import { File } from '@drivebase/files/file.entity';
import { ProvidersService } from '@drivebase/providers';
import { Provider } from '@drivebase/providers/provider.entity';
import { UsersService } from '@drivebase/users';
import { User } from '@drivebase/users/user.entity';
import { WorkspacesService } from '@drivebase/workspaces';
import { Workspace } from '@drivebase/workspaces/workspace.entity';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PrismaService } from './prisma.service';

export const entities = [User, Workspace, Provider, File];

@Global()
@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  providers: [
    PrismaService,
    UsersService,
    ProvidersService,
    WorkspacesService,
    FilesService,
  ],
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  get exports() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.providers;
  },
})
export class DatabaseModule {}
