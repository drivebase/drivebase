import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { WorkspacesService } from '@drivebase/backend/services/workspaces/workspaces.service';
import { CreateWorkspaceDto } from '@drivebase/dtos/create.workspace.dto';
import { UpdateWorkspaceDto } from '@drivebase/dtos/update.workspace.dto';
import { GetUserFromRequest } from '@drivebase/backend/services/users/user.from.request';
import { User, Workspace } from '@prisma/client';
import { WorkspaceGuard } from '@drivebase/backend/services/workspaces/workspace.guard';
import { GetWorkspaceFromRequest } from '@drivebase/backend/services/workspaces/workspace.from.request';

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
  async findActive(@GetWorkspaceFromRequest() workspace: Workspace) {
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
