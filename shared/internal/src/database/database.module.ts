import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  get exports() {
    return this.providers;
  },
})
export class DatabaseModule {}
