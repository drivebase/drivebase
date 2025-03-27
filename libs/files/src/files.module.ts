import { Provider } from '@drivebase/providers';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { File } from './file.entity';
import { FilesService } from './files.service';

@Module({
  imports: [TypeOrmModule.forFeature([File, Provider])],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
