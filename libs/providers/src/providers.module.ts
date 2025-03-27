import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Provider } from './provider.entity';
import { ProvidersService } from './providers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Provider])],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
