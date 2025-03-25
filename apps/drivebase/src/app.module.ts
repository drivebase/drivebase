import { DatabaseModule } from '@drivebase/database/db.module';
// import { WorkspaceProvider } from '@drivebase/workspaces/workspace.provider';
import { Global, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { ApiModule } from './api/api.module';

@Global()
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'frontend'),
    }),
    DatabaseModule,
    ApiModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class AppModule {}
