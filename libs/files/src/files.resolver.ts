import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { GetWorkspaceFromRequest, Workspace, WorkspaceGuard } from '@drivebase/workspaces';

import { CreateFolderInput, ListFilesInput, UpdateFileInput } from './dtos/file.input';
import { OkResponse, PaginatedFilesResponse } from './dtos/file.response';
import { File } from './file.entity';
import { FilesService } from './files.service';

@Resolver(() => File)
@UseGuards(WorkspaceGuard)
export class FilesResolver {
  constructor(private readonly filesService: FilesService) {}

  @Query(() => PaginatedFilesResponse)
  async listFiles(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Args('input', { nullable: true }) input?: ListFilesInput,
  ): Promise<PaginatedFilesResponse> {
    return this.filesService.getFiles(workspace.id, input || {});
  }

  @Query(() => [File])
  async folderContents(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Args('parentPath') parentPath: string,
  ): Promise<File[]> {
    return this.filesService.findByParentPath(workspace.id, parentPath);
  }

  @Query(() => File, { nullable: true })
  async file(@Args('id') id: string): Promise<File | null> {
    return this.filesService.findById(id);
  }

  @Mutation(() => File)
  async createFolder(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Args('input') input: CreateFolderInput,
  ): Promise<File> {
    return this.filesService.createFolder(workspace.id, input.name, input.parentPath);
  }

  @Mutation(() => OkResponse)
  async renameFile(@Args('id') id: string, @Args('name') name: string): Promise<OkResponse> {
    await this.filesService.update(id, { name });
    return { ok: true };
  }

  @Mutation(() => OkResponse)
  async updateFile(@Args('input') input: UpdateFileInput): Promise<OkResponse> {
    await this.filesService.update(input.id, input);
    return { ok: true };
  }

  @Mutation(() => OkResponse)
  async deleteFile(@Args('id') id: string): Promise<OkResponse> {
    await this.filesService.delete(id);
    return { ok: true };
  }

  @Mutation(() => OkResponse)
  async deleteFolder(@Args('id') id: string): Promise<OkResponse> {
    await this.filesService.deleteFolder(id);
    return { ok: true };
  }

  @Mutation(() => String)
  async generateUploadKey(@GetWorkspaceFromRequest() workspace: Workspace): Promise<string> {
    return this.filesService.generateUploadKey(workspace.id);
  }

  @Mutation(() => OkResponse)
  async starFile(@Args('id') id: string): Promise<OkResponse> {
    await this.filesService.starFile(id);
    return { ok: true };
  }

  @Mutation(() => OkResponse)
  async unstarFile(@Args('id') id: string): Promise<OkResponse> {
    await this.filesService.unstarFile(id);
    return { ok: true };
  }
}
