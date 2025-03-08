import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UsersService } from './users/users.service';
import { UsersRepository } from './users/users.repository';
import { ProvidersService } from './providers/providers.service';
import { ProvidersRepository } from './providers/providers.repository';

@Global()
@Module({
  providers: [
    PrismaService,
    // Users
    UsersService,
    UsersRepository,
    // Providers
    ProvidersService,
    ProvidersRepository,
  ],
  get exports() {
    return this.providers;
  },
})
export class DatabaseModule {}
