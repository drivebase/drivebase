import { Provider } from '@drivebase/providers/provider.entity';
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

@Entity()
@Index(['workspaceId', 'path'])
@Index(['providerId', 'referenceId'])
@Index(['parentId'])
export class File {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'boolean', default: false })
  isFolder: boolean;

  @Column({ type: 'varchar', length: 1000 })
  parentPath: string;

  @Column({ type: 'varchar', length: 1000 })
  path: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  mimeType?: string;

  @Column({ type: 'float', nullable: true })
  size?: number;

  @Column({ type: 'boolean', default: false })
  isStarred: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  referenceId?: string;

  @Column({ type: 'uuid', nullable: true })
  workspaceId?: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.files, {
    nullable: true,
  })
  @JoinColumn({ name: 'workspaceId' })
  workspace?: Workspace;

  @Column({ type: 'uuid', nullable: true })
  providerId?: string;

  @ManyToOne(() => Provider, (provider) => provider.files, { nullable: true })
  @JoinColumn({ name: 'providerId' })
  provider?: Provider;

  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  @ManyToOne(() => File, (file) => file.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: File;

  @OneToMany(() => File, (file) => file.parent)
  children: File[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
