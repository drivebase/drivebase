import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ForbiddenException,
  Query,
  UploadedFiles,
  UseInterceptors,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FilesService } from '@drivebase/internal/files/files.service';
import { CreateFolderDto } from '@drivebase/internal/files/dtos/create.file.dto';
import { UpdateFileDto } from '@drivebase/internal/files/dtos/update.file.dto';
import { WorkspaceGuard } from '@drivebase/internal/workspaces/workspace.guard';
import { UseGuards } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { GetWorkspaceFromRequest } from '@drivebase/internal/workspaces/workspace.from.request';
import { Workspace } from '@prisma/client';
import { UploadFileDto } from '@drivebase/internal/files/dtos/upload.file.dto';
import type { Response } from 'express';
import { SkipTransformInterceptor } from '@drivebase/internal/helpers/transform.response';

@Controller('/files')
@UseGuards(WorkspaceGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  async create(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Body() createFolderDto: CreateFolderDto
  ) {
    return this.filesService.createFolder(
      workspace.id,
      createFolderDto.name,
      createFolderDto.parentPath
    );
  }

  @Get()
  async findAll(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Query('parentPath') parentPath?: string,
    @Query('isStarred') isStarred?: string
  ) {
    return this.filesService.findWorkspaceFiles(workspace.id, {
      parentPath,
      isStarred: isStarred === 'true',
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const file = await this.filesService.findById(id);
    if (!file) {
      throw new ForbiddenException('File not found or access denied');
    }
    return file;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateFileDto: UpdateFileDto) {
    return this.filesService.update(id, updateFileDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.filesService.delete(id);
  }

  @Post('upload')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadFile(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadFileDto: UploadFileDto
  ) {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }

    return this.filesService.uploadFile(files, uploadFileDto);
  }

  @Get('download/:id')
  @SkipTransformInterceptor()
  async downloadFile(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response
  ) {
    const file = await this.filesService.findById(id);
    if (!file) {
      throw new ForbiddenException('File not found or access denied');
    }

    const { fileStream, metadata } = await this.filesService.downloadFile(id);

    // Set appropriate headers for file download
    response.set({
      'Content-Type': metadata.mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(
        metadata.fileName
      )}"`,
      'Content-Length': metadata.size,
    });

    // Return the stream directly
    return new StreamableFile(fileStream);
  }

  @Post('star/:id')
  async starFile(@Param('id') id: string) {
    return this.filesService.starFile(id);
  }

  @Post('unstar/:id')
  async unstarFile(@Param('id') id: string) {
    return this.filesService.unstarFile(id);
  }
}
