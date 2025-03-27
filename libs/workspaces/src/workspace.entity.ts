import { File } from '@drivebase/files/file.entity';
import { Provider } from '@drivebase/providers/provider.entity';
import { User } from '@drivebase/users/user.entity';
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

@Entity()
export class Workspace {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'uuid' })
  ownerId: string;

  @ManyToOne(() => User, (user) => user.workspaces)
  @JoinColumn({ name: 'ownerId' })
  owner: Relation<User>;

  @OneToMany(() => Provider, (provider) => provider.workspace)
  providers: Relation<Provider>[];

  @OneToMany(() => File, (file) => file.workspace)
  files: Relation<File>[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
