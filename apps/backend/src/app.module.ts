import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@xilehq/internal/database/database.module';
import { ApiModule } from '@xilehq/backend/api/api.module';

@Global()
@Module({
  imports: [DatabaseModule, ApiModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
