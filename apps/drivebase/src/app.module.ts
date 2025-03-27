import { AuthModule } from '@drivebase/auth';
import { FilesModule } from '@drivebase/files';
import { File } from '@drivebase/files/file.entity';
import { ProvidersModule } from '@drivebase/providers';
import { Provider } from '@drivebase/providers/provider.entity';
import { UsersModule } from '@drivebase/users';
import { User } from '@drivebase/users/user.entity';
import { WorkspacesModule } from '@drivebase/workspaces';
import { Workspace } from '@drivebase/workspaces/workspace.entity';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { TypeOrmModule } from '@nestjs/typeorm';

const entities = [User, Workspace, Provider, File];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
