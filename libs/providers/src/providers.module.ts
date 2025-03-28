import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Workspace } from '@drivebase/workspaces';

import { Provider } from './provider.entity';
import { ProvidersResolver } from './providers.resolver';
import { ProvidersService } from './providers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, Workspace])],
  providers: [ProvidersService, ProvidersResolver],
  exports: [ProvidersService],
})
export class ProvidersModule {}
