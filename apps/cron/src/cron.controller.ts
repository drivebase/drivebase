import { Controller, Get } from '@nestjs/common';
import { CronService } from './cron.service';

@Controller()
export class CronController {
  constructor(private readonly cronService: CronService) {}

  @Get()
  getHello(): string {
    return this.cronService.getHello();
  }
}
