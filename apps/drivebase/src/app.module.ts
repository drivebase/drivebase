import { DatabaseModule } from '@drivebase/database/db.module';
import { Global, Module } from '@nestjs/common';

import { ApiModule } from './api/api.module';

@Global()
@Module({
  imports: [DatabaseModule, ApiModule],
  controllers: [],
  providers: [],
  exports: [],
})
export class AppModule {}
