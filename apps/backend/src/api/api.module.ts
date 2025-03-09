import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from '@drivebase/backend/api/controllers/auth.controller';
import { ProvidersController } from '@drivebase/backend/api/controllers/providers.controller';
import { WorkspacesController } from '@drivebase/backend/api/controllers/workspaces.controller';
import { AuthService } from '@drivebase/backend/services/auth/auth.service';
import { LocalStrategy } from '@drivebase/backend/services/auth/local.strategy';
import { JwtStrategy } from '@drivebase/backend/services/auth/jwt.strategy';
import { AuthGuard } from '@drivebase/backend/services/auth/auth.guard';
import { WorkspaceGuard } from '@drivebase/internal/workspaces/workspace.guard';

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
