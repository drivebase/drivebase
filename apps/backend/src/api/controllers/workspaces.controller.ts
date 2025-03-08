import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { WorkspacesService } from '@xilehq/internal/workspaces/workspaces.service';
import { CreateWorkspaceDto } from '@xilehq/internal/workspaces/dtos/create.workspace.dto';
import { UpdateWorkspaceDto } from '@xilehq/internal/workspaces/dtos/update.workspace.dto';
import { UserInRequest } from '@xilehq/internal/types/auth.types';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  async create(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Request() req: Request & { user: UserInRequest }
  ) {
    return this.workspacesService.create(req.user.id, createWorkspaceDto);
  }

  @Get()
  async findAll(@Request() req: Request & { user: UserInRequest }) {
    return this.workspacesService.findByUserId(req.user.id);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Request() req: Request & { user: UserInRequest }
  ) {
    const workspace = await this.workspacesService.findById(id);
    if (workspace?.userId !== req.user.id) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    return workspace;
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @Request() req: Request & { user: UserInRequest }
  ) {
    const workspace = await this.workspacesService.findById(id);
    if (workspace?.userId !== req.user.id) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    return this.workspacesService.update(id, updateWorkspaceDto);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Request() req: Request & { user: UserInRequest }
  ) {
    const workspace = await this.workspacesService.findById(id);
    if (workspace?.userId !== req.user.id) {
      throw new ForbiddenException('You do not have access to this workspace');
    }
    return this.workspacesService.delete(id);
  }
}
