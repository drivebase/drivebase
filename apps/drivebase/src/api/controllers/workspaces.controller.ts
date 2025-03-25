import { GetUserFromRequest } from '@drivebase/users/user.from.request';
import { CreateWorkspaceDto } from '@drivebase/workspaces/dtos/create.workspace.dto';
import { UpdateWorkspaceDto } from '@drivebase/workspaces/dtos/update.workspace.dto';
import { GetWorkspaceFromRequest } from '@drivebase/workspaces/workspace.from.request';
import { WorkspaceGuard } from '@drivebase/workspaces/workspace.guard';
import { WorkspacesService } from '@drivebase/workspaces/workspaces.service';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { User, Workspace } from '@prisma/client';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  async create(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @GetUserFromRequest() user: User,
  ) {
    return this.workspacesService.create(user.id, createWorkspaceDto);
  }

  @Get('stats')
  @UseGuards(WorkspaceGuard)
  async getStats(@GetWorkspaceFromRequest() workspace: Workspace) {
    return this.workspacesService.getWorkspaceStats(workspace.id);
  }

  @Get('/current')
  @UseGuards(WorkspaceGuard)
  findActive(@GetWorkspaceFromRequest() workspace: Workspace) {
    return workspace;
  }

  @Get()
  async findAll(@GetUserFromRequest() user: User) {
    const workspaces = await this.workspacesService.findByUserId(user.id);
    return workspaces;
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @GetUserFromRequest() user: User) {
    const workspace = await this.workspacesService.findById(id);
    if (workspace?.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    return workspace;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @GetUserFromRequest() user: User,
  ) {
    const workspace = await this.workspacesService.findById(id);
    if (workspace?.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    return this.workspacesService.update(id, updateWorkspaceDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @GetUserFromRequest() user: User) {
    const workspace = await this.workspacesService.findById(id);
    if (workspace?.ownerId !== user.id) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    return this.workspacesService.delete(id);
  }
}
