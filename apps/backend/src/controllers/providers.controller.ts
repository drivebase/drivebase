import {
  Controller,
  Get,
  Query,
  UseGuards,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { ProvidersService } from '@drivebase/backend/services/providers/providers.service';
import { Workspace } from '@prisma/client';
import { GetWorkspaceFromRequest } from '@drivebase/backend/services/workspaces/workspace.from.request';
import { ProviderType } from '@prisma/client';
import { WorkspaceGuard } from '@drivebase/backend/services/workspaces/workspace.guard';
import { CallbackProviderDto } from '@drivebase/dtos/callback.provider.dto';
import { AuthorizeAPIProviderDto } from '@drivebase/dtos/auth.provider.dto';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('available')
  async findAvailableProviders() {
    return this.providersService.findAvailableProviders();
  }

  @Get()
  @UseGuards(WorkspaceGuard)
  async findProviders(@GetWorkspaceFromRequest() workspace: Workspace) {
    return this.providersService.findProviders(workspace.id);
  }

  /**
   * This endpoint is used to authorize an API key based provider, eg. Amazon S3.
   *
   * @param type - The type of provider
   * @param workspace - The workspace
   * @param authProviderDto - The auth provider dto
   */
  @Post('/api-key/authorize')
  @UseGuards(WorkspaceGuard)
  async authorize(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Body() body: AuthorizeAPIProviderDto,
  ) {
    return this.providersService.authorizeApiKey(
      workspace.id,
      body.type,
      body.credentials,
    );
  }

  @Get('/oauth/redirect')
  @UseGuards(WorkspaceGuard)
  async connect(
    @Query('type') type: ProviderType,
    @Query('clientId') clientId: string,
    @Query('clientSecret') clientSecret: string,
    @GetWorkspaceFromRequest() workspace: Workspace,
  ) {
    return this.providersService.getAuthUrl(
      type,
      clientId,
      clientSecret,
      workspace.id,
    );
  }

  @Post('/oauth/callback')
  async callback(@Body() body: CallbackProviderDto) {
    return this.providersService.callback(body.state, body.code);
  }

  @Get('/:providerId/files')
  @UseGuards(WorkspaceGuard)
  async listFiles(
    @Param('providerId') providerId: string,
    @Query('path') path?: string,
  ) {
    return this.providersService.listFiles(providerId, path);
  }
}
