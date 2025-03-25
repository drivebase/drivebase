import { AuthorizeAPIProviderDto } from '@drivebase/providers/dtos/auth.provider.dto';
import { CallbackProviderDto } from '@drivebase/providers/dtos/callback.provider.dto';
import { ProvidersService } from '@drivebase/providers/providers.service';
import { GetWorkspaceFromRequest } from '@drivebase/workspaces/workspace.from.request';
import { WorkspaceGuard } from '@drivebase/workspaces/workspace.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Workspace } from '@prisma/client';
import { ProviderType } from '@prisma/client';

@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get('available')
  findAvailableProviders() {
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
  connect(
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
    return this.providersService.callback(body.state ?? '', body.code);
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
