import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
  UpdateDateColumn,
} from 'typeorm';

import { Field, ObjectType } from '@nestjs/graphql';

import { File } from '@drivebase/files/file.entity';
import { Provider } from '@drivebase/providers/provider.entity';
import { User } from '@drivebase/users/user.entity';

@Entity()
@ObjectType()
export class Workspace {
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Field(() => String)
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Field(() => String)
  @Column({ type: 'uuid' })
  ownerId: string;

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.workspaces)
  @JoinColumn({ name: 'ownerId' })
  owner: Relation<User>;

  @Field(() => [Provider])
  @OneToMany(() => Provider, (provider) => provider.workspace)
  providers: Relation<Provider>[];

  @Field(() => [File])
  @OneToMany(() => File, (file) => file.workspace)
  files: Relation<File>[];

  @Field(() => Date)
  @CreateDateColumn()
  createdAt: Date;

  @Field(() => Date)
  @UpdateDateColumn()
  updatedAt: Date;
}
