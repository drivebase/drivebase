import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@xilehq/internal/database.module';
import { ApiModule } from '@xilehq/backend/api/api.module';

import { WorkspaceProvider } from '@xilehq/internal/workspaces/workspace.provider';

@Global()
@Module({
  imports: [DatabaseModule, ApiModule],
  controllers: [],
  providers: [WorkspaceProvider],
  exports: [WorkspaceProvider],
})
export class AppModule {}
