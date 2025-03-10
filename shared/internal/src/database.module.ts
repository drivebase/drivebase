import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UsersService } from './users/users.service';
import { ProvidersService } from './providers/providers.service';
import { WorkspacesService } from './workspaces/workspaces.service';
import { KeysService } from './keys/keys.service';
import { AccountsService } from './accounts/accounts.service';

@Global()
@Module({
  providers: [
    PrismaService,
    UsersService,
    ProvidersService,
    WorkspacesService,
    KeysService,
    AccountsService,
  ],
  get exports() {
    return this.providers;
  },
})
export class DatabaseModule {}
