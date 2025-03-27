import { File } from '@drivebase/files/file.entity';
import { Workspace } from '@drivebase/workspaces/workspace.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

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

@Entity()
@Index(['workspaceId'])
@Index(['type'])
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({
    type: 'enum',
    enum: ProviderType,
  })
  type: ProviderType;

  @Column({
    type: 'enum',
    enum: AuthType,
  })
  authType: AuthType;

  @Column('json')
  credentials: Record<string, any>;

  @Column('json', { nullable: true })
  metadata?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'uuid' })
  workspaceId: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.providers)
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @OneToMany(() => File, (file) => file.provider)
  files: File[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
