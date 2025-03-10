import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AccountsService } from '@drivebase/internal/accounts/accounts.service';
import { CallbackProviderDto } from '@drivebase/internal/providers/dtos/callback.provider.dto';
import { ProviderType } from '@prisma/client';
import { GetWorkspaceFromRequest } from '@drivebase/internal/workspaces/workspace.from.request';
import { Workspace } from '@prisma/client';
import { WorkspaceGuard } from '@drivebase/internal/workspaces/workspace.guard';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @UseGuards(WorkspaceGuard)
  async findAll(@GetWorkspaceFromRequest() workspace: Workspace) {
    return this.accountsService.getConnectedAccounts(workspace.id);
  }

  @Get('/auth')
  @UseGuards(WorkspaceGuard)
  async connect(
    @Query('type') type: ProviderType,
    @GetWorkspaceFromRequest() workspace: Workspace
  ) {
    return this.accountsService.getAuthUrl(workspace.id, type);
  }

  @Post('callback')
  async callback(@Body() body: CallbackProviderDto) {
    return this.accountsService.callback(body);
  }
}
