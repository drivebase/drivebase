import type { Response } from 'express';

import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { Public } from '@drivebase/auth';

import { FilesService } from './files.service';

class UploadFileDto {
  providerId: string;
  path: string;
}

@Controller('files')
export class FileController {
  constructor(private readonly filesService: FilesService) {}

  @Public()
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files'))
  uploadFile(
    @Query('key') key: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadFileDto,
  ) {
    let filesArray: Express.Multer.File[] = [];

    if (Array.isArray(files)) {
      filesArray = files;
    } else {
      filesArray = [files];
    }

    return this.filesService.uploadFile(
      filesArray,
      {
        providerId: body.providerId,
        path: body.path,
      },
      key,
    );
  }

  @Public()
  @Get('download')
  async downloadFile(
    @Res({ passthrough: true }) response: Response,
    @Query('fileId') fileId: string,
  ) {
    const { metadata, stream } = await this.filesService.downloadFile(fileId);

    response.set({
      'Content-Type': metadata.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(metadata.name)}"`,
      'Content-Length': metadata.size,
    });

    return new StreamableFile(stream);
  }
}
