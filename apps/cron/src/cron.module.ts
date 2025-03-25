import { Module } from '@nestjs/common';
import { CronController } from './cron.controller';
import { CronService } from './cron.service';

@Module({
  imports: [],
  controllers: [CronController],
  providers: [CronService],
})
export class CronModule {}
