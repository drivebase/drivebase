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
import { GetWorkspaceFromRequest } from '@xilehq/internal/workspaces/workspace.from.request';
import { ProviderType, Workspace } from '@prisma/client';
import { WorkspaceGuard } from '@xilehq/internal/workspaces/workspace.guard';
import { CallbackProviderDto } from '@xilehq/internal/providers/dtos/callback.provider.dto';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Post()
  @UseGuards(WorkspaceGuard)
  async create(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Body() createProviderDto: CreateProviderDto
  ) {
    return this.providersService.create(workspace.id, createProviderDto);
  }

  @Get()
  @UseGuards(WorkspaceGuard)
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

  @Get(':id/auth')
  async connect(@Param('id') id: string) {
    return this.providersService.getAuthUrl(id);
  }

  @Post('callback')
  async callback(@Body() body: CallbackProviderDto) {
    console.log('body', body);
    return this.providersService.callback(body);
  }

  @Get('type/:type')
  async findByType(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Param('type') type: ProviderType
  ) {
    return this.providersService.findByWorkspaceIdAndType(workspace.id, type);
  }
}
