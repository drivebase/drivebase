import { Controller, Get } from '@nestjs/common';
import { Public } from '@drivebase/backend/services/auth/auth.guard';

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
