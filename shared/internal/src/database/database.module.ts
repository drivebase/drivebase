import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UsersService } from './users/users.service';
import { UsersRepository } from './users/users.repository';

@Global()
@Module({
  providers: [PrismaService, UsersService, UsersRepository],
  get exports() {
    return this.providers;
  },
})
export class DatabaseModule {}
