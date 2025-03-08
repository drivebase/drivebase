import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '@xilehq/backend/api/controllers/auth.controller';
import { ProvidersController } from '@xilehq/backend/api/controllers/providers.controller';
import { WorkspacesController } from '@xilehq/backend/api/controllers/workspaces.controller';
import { AuthService } from '@xilehq/backend/services/auth/auth.service';
import { LocalStrategy } from '@xilehq/backend/services/auth/local.strategy';
import { JwtStrategy } from '@xilehq/backend/services/auth/jwt.strategy';
import { AuthGuard } from '@xilehq/backend/services/auth/auth.guard';
import { WorkspaceGuard } from '@xilehq/internal/workspaces/workspace.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.AUTH_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, ProvidersController, WorkspacesController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    AuthService,
    LocalStrategy,
    JwtStrategy,
    WorkspaceGuard,
  ],
})
export class ApiModule {}
