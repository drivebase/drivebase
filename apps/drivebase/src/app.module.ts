import GraphQLJSON from 'graphql-type-json';

import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '@drivebase/auth';
import { FilesModule } from '@drivebase/files';
import { File } from '@drivebase/files/file.entity';
import { ProvidersModule } from '@drivebase/providers';
import { Provider } from '@drivebase/providers/provider.entity';
import { UsersModule } from '@drivebase/users';
import { User } from '@drivebase/users/user.entity';
import { WorkspacesModule } from '@drivebase/workspaces';
import { Workspace } from '@drivebase/workspaces/workspace.entity';

import { PublicModule } from './public/public.module';

const entities = [User, Workspace, Provider, File];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: './schema.gql',
      resolvers: {
        JSON: GraphQLJSON,
      },
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
    AuthModule,
    UsersModule,
    WorkspacesModule,
    ProvidersModule,
    FilesModule,
    PublicModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
