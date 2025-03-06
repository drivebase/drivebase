import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@xile/internal/database/database.module';
import { ApiModule } from '@xile/backend/api/api.module';

@Global()
@Module({
  imports: [DatabaseModule, ApiModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
