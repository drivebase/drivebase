import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { GetWorkspaceFromRequest, Workspace, WorkspaceGuard } from '@drivebase/workspaces';

import {
  AuthorizeApiKeyInput,
  ConnectLocalProviderInput,
  GetAuthUrlInput,
  HandleOAuthCallbackInput,
  ListProviderFilesInput,
  UpdateProviderInput,
  UpdateProviderMetadataInput,
} from './dtos/provider.input';
import { AuthUrlResponse } from './dtos/provider.response';
import { Provider } from './provider.entity';
import { ProvidersService } from './providers.service';
import { PaginatedFileMetadata, PaginatedFileMetadataType, ProviderMetadata } from './types';

@Resolver(() => Provider)
@UseGuards(WorkspaceGuard)
export class ProvidersResolver {
  constructor(private readonly providersService: ProvidersService) {}

  @Query(() => [Provider])
  async connectedProviders(@GetWorkspaceFromRequest() workspace: Workspace): Promise<Provider[]> {
    return this.providersService.findProviders(workspace.id);
  }

  @Query(() => [ProviderMetadata])
  availableProviders(): ProviderMetadata[] {
    return this.providersService.findAvailableProviders();
  }

  @Mutation(() => AuthUrlResponse)
  getAuthUrl(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Args('input') input: GetAuthUrlInput,
  ): Promise<AuthUrlResponse> {
    const url = this.providersService.getAuthUrl(
      input.type,
      input.clientId,
      input.clientSecret,
      workspace.id,
    );
    return Promise.resolve({ url });
  }

  @Mutation(() => Provider)
  async handleOAuthCallback(@Args('input') input: HandleOAuthCallbackInput): Promise<Provider> {
    return this.providersService.handleOAuthCallback(input.state, input.code);
  }

  @Mutation(() => Provider)
  async authorizeApiKey(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Args('input') input: AuthorizeApiKeyInput,
  ): Promise<Provider> {
    return this.providersService.authorizeApiKey(workspace.id, input.type, input.credentials);
  }

  @Mutation(() => Provider)
  async connectLocalProvider(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Args('input') input: ConnectLocalProviderInput,
  ): Promise<Provider> {
    return this.providersService.connectLocalProvider(workspace.id, input.basePath);
  }

  @Mutation(() => PaginatedFileMetadata)
  async listProviderFiles(
    @Args('input') input: ListProviderFilesInput,
  ): Promise<PaginatedFileMetadataType> {
    return this.providersService.listFiles(input.id, input.path);
  }

  @Mutation(() => Provider)
  async updateProvider(@Args('input') input: UpdateProviderInput): Promise<Provider> {
    return this.providersService.updateProvider(input.id, {
      name: input.name,
      isActive: input.isActive,
    });
  }

  @Mutation(() => Provider)
  async updateProviderMetadata(
    @Args('input') input: UpdateProviderMetadataInput,
  ): Promise<Provider> {
    return this.providersService.updateProviderMetadata(input.id, input.metadata);
  }
}
