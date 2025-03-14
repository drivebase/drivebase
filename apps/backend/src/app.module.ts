import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '@drivebase/internal/database.module';
import { ApiModule } from '@drivebase/backend/api/api.module';
import { WorkspaceProvider } from '@drivebase/internal/workspaces/workspace.provider';

@Global()
@Module({
  imports: [DatabaseModule, ApiModule],
  controllers: [],
  providers: [WorkspaceProvider],
  exports: [WorkspaceProvider],
})
export class AppModule {}
