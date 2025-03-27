import { Provider } from '@drivebase/providers/provider.entity';
import { Workspace } from '@drivebase/workspaces/workspace.entity';
import { Field, ObjectType } from '@nestjs/graphql';
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

@Entity()
@ObjectType()
@Index(['workspaceId', 'path'])
@Index(['providerId', 'referenceId'])
@Index(['parentId'])
export class File {
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => String)
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Field(() => Boolean)
  @Column({ type: 'boolean', default: false })
  isFolder: boolean;

  @Field(() => String)
  @Column({ type: 'varchar', length: 1000 })
  parentPath: string;

  @Field(() => String)
  @Column({ type: 'varchar', length: 1000 })
  path: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  mimeType?: string;

  @Field(() => Number, { nullable: true })
  @Column({ type: 'float', nullable: true })
  size?: number;

  @Field(() => Boolean)
  @Column({ type: 'boolean', default: false })
  isStarred: boolean;

  @Field(() => String, { nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  referenceId?: string;

  @Field(() => String, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  workspaceId?: string;

  @Field(() => Workspace, { nullable: true })
  @ManyToOne(() => Workspace, (workspace) => workspace.files, {
    nullable: true,
  })
  @JoinColumn({ name: 'workspaceId' })
  workspace?: Relation<Workspace>;

  @Field(() => String, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  providerId?: string;

  @Field(() => Provider, { nullable: true })
  @ManyToOne(() => Provider, (provider) => provider.files, { nullable: true })
  @JoinColumn({ name: 'providerId' })
  provider?: Relation<Provider>;

  @Field(() => String, { nullable: true })
  @Column({ type: 'uuid', nullable: true })
  parentId?: string;

  @Field(() => File, { nullable: true })
  @ManyToOne(() => File, (file) => file.children, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent?: Relation<File>;

  @Field(() => [File])
  @OneToMany(() => File, (file) => file.parent)
  children: Relation<File>[];

  @Field(() => Date)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt: Date;
}
