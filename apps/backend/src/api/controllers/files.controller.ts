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
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesService } from '@drivebase/internal/files/files.service';
import { CreateFolderDto } from '@drivebase/internal/files/dtos/create.file.dto';
import { UpdateFileDto } from '@drivebase/internal/files/dtos/update.file.dto';
import { WorkspaceGuard } from '@drivebase/internal/workspaces/workspace.guard';
import { UseGuards } from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { GetWorkspaceFromRequest } from '@drivebase/internal/workspaces/workspace.from.request';
import { Workspace } from '@prisma/client';
import { UploadFileDto } from '@drivebase/internal/files/dtos/upload.file.dto';

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
    @Query('parentPath') parentPath?: string
  ) {
    if (parentPath) {
      return this.filesService.findByParentPath(workspace.id, parentPath);
    }
    return this.filesService.findByWorkspaceId(workspace.id);
  }

  @Get(':id')
  async findOne(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Param('id') id: string
  ) {
    const file = await this.filesService.findById(id);
    if (!file || file.workspaceId !== workspace.id) {
      throw new ForbiddenException('File not found or access denied');
    }
    return file;
  }

  @Put(':id')
  async update(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Param('id') id: string,
    @Body() updateFileDto: UpdateFileDto
  ) {
    const file = await this.filesService.findById(id);
    if (!file || file.workspaceId !== workspace.id) {
      throw new ForbiddenException('File not found or access denied');
    }
    return this.filesService.update(id, updateFileDto);
  }

  @Delete(':id')
  async remove(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Param('id') id: string
  ) {
    const file = await this.filesService.findById(id);
    if (!file || file.workspaceId !== workspace.id) {
      throw new ForbiddenException('File not found or access denied');
    }
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
}
