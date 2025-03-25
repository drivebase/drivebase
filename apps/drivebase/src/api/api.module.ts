import { AuthGuard } from '@drivebase/auth/auth.guard';
import { AuthService } from '@drivebase/auth/auth.service';
import { JwtStrategy } from '@drivebase/auth/jwt.strategy';
import { LocalStrategy } from '@drivebase/auth/local.strategy';
import { WorkspaceGuard } from '@drivebase/workspaces/workspace.guard';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './controllers/auth.controller';
import { FilesController } from './controllers/files.controller';
import { ProvidersController } from './controllers/providers.controller';
import { PublicController } from './controllers/public.controller';
import { WorkspacesController } from './controllers/workspaces.controller';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      global: true,
      secret: process.env.AUTH_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    AuthController,
    ProvidersController,
    WorkspacesController,
    FilesController,
    PublicController,
  ],
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
