import { Global, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ApiModule } from './api.module';
import { DatabaseModule } from './services/database.module';
import { WorkspaceProvider } from './services/workspaces/workspace.provider';

@Global()
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'frontend'),
    }),
    ApiModule,
    DatabaseModule,
  ],
  controllers: [],
  providers: [WorkspaceProvider],
  exports: [WorkspaceProvider],
})
export class AppModule {}
