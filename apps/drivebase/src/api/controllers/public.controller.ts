import { Public } from '@drivebase/auth/auth.guard';
import { Controller, Get } from '@nestjs/common';

@Public()
@Controller('public')
export class PublicController {
  @Get('version')
  getVersion() {
    if (process.env.NODE_ENV === 'development') {
      return 'development';
    }
    return process.env.APP_VERSION || '0.0.0';
  }

  @Get('ping')
  ping() {
    return 'pong';
  }
}
