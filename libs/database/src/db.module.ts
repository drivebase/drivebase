import { FilesService } from '@drivebase/files';
import { ProvidersService } from '@drivebase/providers';
import { UsersService } from '@drivebase/users';
import { WorkspacesService } from '@drivebase/workspaces';
import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

@Global()
@Module({
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
