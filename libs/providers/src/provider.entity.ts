import GraphQLJSON from 'graphql-type-json';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { File } from '@drivebase/files/file.entity';
import { Workspace } from '@drivebase/workspaces/workspace.entity';

export enum ProviderType {
  LOCAL = 'LOCAL',
  GOOGLE_DRIVE = 'GOOGLE_DRIVE',
  AMAZON_S3 = 'AMAZON_S3',
  DROPBOX = 'DROPBOX',
  ONEDRIVE = 'ONEDRIVE',
  TELEGRAM = 'TELEGRAM',
}

export enum AuthType {
  NONE = 'NONE',
  OAUTH2 = 'OAUTH2',
  API_KEY = 'API_KEY',
  BASIC = 'BASIC',
}

registerEnumType(ProviderType, {
  name: 'ProviderType',
});

registerEnumType(AuthType, {
  name: 'AuthType',
});

@Entity()
@ObjectType()
@Index(['workspaceId'])
@Index(['type'])
export class Provider {
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => String)
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Field(() => ProviderType)
  @Column({
    type: 'enum',
    enum: ProviderType,
  })
  type: ProviderType;

  @Field(() => AuthType)
  @Column({
    type: 'enum',
    enum: AuthType,
  })
  authType: AuthType;

  @Field(() => GraphQLJSON)
  @Column('json')
  credentials: Record<string, any>;

  @Field(() => GraphQLJSON)
  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  @Field(() => Boolean)
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Field(() => String)
  @Column({ type: 'uuid' })
  workspaceId: string;

  @Field(() => Workspace)
  @ManyToOne(() => Workspace, (workspace) => workspace.providers)
  @JoinColumn({ name: 'workspaceId' })
  workspace: Relation<Workspace>;

  @Field(() => [File])
  @OneToMany(() => File, (file) => file.provider)
  files: Relation<File>[];

  @Field(() => Date)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt: Date;
}
