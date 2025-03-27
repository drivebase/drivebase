import { DatabaseModule, entities } from '@drivebase/database/db.module';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ApiModule } from './api/api.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        entities,
        type: 'postgres',
        url: configService.get('DATABASE_URL'),
        synchronize: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    DatabaseModule,
    ApiModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class AppModule {}
