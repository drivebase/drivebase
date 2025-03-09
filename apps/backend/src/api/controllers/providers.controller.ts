import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ProvidersService } from '@drivebase/internal/providers/providers.service';
import { CallbackProviderDto } from '@drivebase/internal/providers/dtos/callback.provider.dto';
import { ProviderType } from '@prisma/client';
import { GetWorkspaceFromRequest } from '@drivebase/internal/workspaces/workspace.from.request';
import { Workspace } from '@prisma/client';
import { WorkspaceGuard } from '@drivebase/internal/workspaces/workspace.guard';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('available')
  async findAvailableProviders() {
    return this.providersService.findAvailableProviders();
  }

  @Get('/auth')
  @UseGuards(WorkspaceGuard)
  async connect(
    @Query('type') type: ProviderType,
    @GetWorkspaceFromRequest() workspace: Workspace
  ) {
    return this.providersService.getAuthUrl(workspace.id, type);
  }

  @Post('callback')
  async callback(@Body() body: CallbackProviderDto) {
    return this.providersService.callback(body);
  }
}
