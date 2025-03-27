import { CurrentUser } from '@drivebase/auth/user.decorator';
import { User } from '@drivebase/users';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from './dtos/workspace.input';
import { WorkspaceResponse, WorkspaceStat } from './dtos/workspace.response';
import { Workspace } from './workspace.entity';
import { WorkspacesService } from './workspaces.service';

@Resolver(() => Workspace)
export class WorkspacesResolver {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Query(() => [Workspace])
  async workspaces(@CurrentUser() user: User): Promise<Workspace[]> {
    return this.workspacesService.findByUserId(user.id);
  }

  @Query(() => Workspace, { nullable: true })
  async workspace(@Args('id') id: string): Promise<Workspace | null> {
    return this.workspacesService.findById(id);
  }

  @Query(() => Workspace, { nullable: true })
  async workspaceWithProviders(
    @Args('id') id: string,
  ): Promise<Workspace | null> {
    return this.workspacesService.getWorkspaceWithProviders(id);
  }

  @Query(() => [WorkspaceStat])
  async workspaceStats(@Args('id') id: string): Promise<WorkspaceStat[]> {
    return this.workspacesService.getWorkspaceStats(id);
  }

  @Mutation(() => Workspace)
  async createWorkspace(
    @CurrentUser() user: User,
    @Args('input') input: CreateWorkspaceInput,
  ): Promise<Workspace> {
    return this.workspacesService.create(user.id, input);
  }

  @Mutation(() => WorkspaceResponse)
  async updateWorkspace(
    @Args('input') input: UpdateWorkspaceInput,
  ): Promise<WorkspaceResponse> {
    await this.workspacesService.update(input.id, input);
    return { ok: true };
  }

  @Mutation(() => WorkspaceResponse)
  async deleteWorkspace(@Args('id') id: string): Promise<WorkspaceResponse> {
    await this.workspacesService.delete(id);
    return { ok: true };
  }
}
