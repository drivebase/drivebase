import { Module } from '@nestjs/common';

import { PublicResolver } from './public.resolver';

@Module({
  imports: [],
  providers: [PublicResolver],
})
export class PublicModule {}
