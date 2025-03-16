import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@drivebase/internal/database.module';
import { ApiModule } from '@drivebase/backend/api/api.module';
import { WorkspaceProvider } from '@drivebase/internal/workspaces/workspace.provider';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

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
  providers: [WorkspaceProvider],
  exports: [WorkspaceProvider],
})
export class AppModule {}
