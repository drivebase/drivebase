import { Injectable } from '@nestjs/common';

@Injectable()
export class CronService {
  getHello(): string {
    return 'Hello World!';
  }
}
