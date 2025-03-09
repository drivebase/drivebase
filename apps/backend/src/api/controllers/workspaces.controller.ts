import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ForbiddenException,
} from '@nestjs/common';
import { WorkspacesService } from '@drivebase/internal/workspaces/workspaces.service';
import { CreateWorkspaceDto } from '@drivebase/internal/workspaces/dtos/create.workspace.dto';
import { UpdateWorkspaceDto } from '@drivebase/internal/workspaces/dtos/update.workspace.dto';
import { GetUserFromRequest } from '@drivebase/internal/users/user.from.request';
import { User } from '@prisma/client';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  async create(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @GetUserFromRequest() user: User
  ) {
    return this.workspacesService.create(user.id, createWorkspaceDto);
  }

  @Get()
  async findAll(@GetUserFromRequest() user: User) {
    const workspaces = await this.workspacesService.findByUserId(user.id);
    return workspaces;
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetUserFromRequest() user: User) {
    const workspace = await this.workspacesService.findById(id);
    if (workspace?.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    return workspace;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @GetUserFromRequest() user: User
  ) {
    const workspace = await this.workspacesService.findById(id);
    if (workspace?.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    return this.workspacesService.update(id, updateWorkspaceDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @GetUserFromRequest() user: User) {
    const workspace = await this.workspacesService.findById(id);
    if (workspace?.userId !== user.id) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    return this.workspacesService.delete(id);
  }
}
