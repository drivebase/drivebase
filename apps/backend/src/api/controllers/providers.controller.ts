import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProvidersService } from '@xilehq/internal/providers/providers.service';
import { CreateProviderDto } from '@xilehq/internal/providers/dtos/create.provider.dto';
import { UpdateProviderDto } from '@xilehq/internal/providers/dtos/update.provider.dto';
import { WorkspaceGuard } from '@xilehq/internal/workspaces/workspace.guard';
import { GetWorkspaceFromRequest } from '@xilehq/internal/workspaces/workspace.from.request';
import { ProviderType, Workspace } from '@prisma/client';

@UseGuards(WorkspaceGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  async create(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Body() createProviderDto: CreateProviderDto
  ) {
    return this.providersService.create(workspace.id, createProviderDto);
  }

  @Get()
  async findAll(@GetWorkspaceFromRequest() workspace: Workspace) {
    return this.providersService.findByWorkspaceId(workspace.id);
  }

  @Get('all')
  async findAvailableProviders() {
    return this.providersService.findAvailableProviders();
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateProviderDto: UpdateProviderDto
  ) {
    return this.providersService.update(id, updateProviderDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.providersService.delete(id);
  }

  @Get('type/:type')
  async findByType(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Param('type') type: ProviderType
  ) {
    return this.providersService.findByWorkspaceIdAndType(workspace.id, type);
  }
}
