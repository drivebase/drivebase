import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '@drivebase/auth/user.decorator';
import { User } from '@drivebase/users';

import { CreateWorkspaceInput, UpdateWorkspaceInput } from './dtos/workspace.input';
import { WorkspaceResponse, WorkspaceStat } from './dtos/workspace.response';
import { Workspace } from './workspace.entity';
import { GetWorkspaceFromRequest } from './workspace.from.request';
import { WorkspaceGuard } from './workspace.guard';
import { WorkspacesService } from './workspaces.service';

@Resolver(() => Workspace)
export class WorkspacesResolver {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Mutation(() => Workspace)
  async createWorkspace(
    @CurrentUser() user: User,
    @Args('input') input: CreateWorkspaceInput,
  ): Promise<Workspace> {
    return this.workspacesService.create(user.id, input);
  }

  @Query(() => [Workspace])
  async workspaces(@CurrentUser() user: User): Promise<Workspace[]> {
    return this.workspacesService.findByUserId(user.id);
  }

  @Query(() => Workspace, { nullable: true })
  async workspace(@Args('id') id: string): Promise<Workspace | null> {
    return this.workspacesService.findById(id);
  }

  @UseGuards(WorkspaceGuard)
  @Mutation(() => WorkspaceResponse)
  async updateWorkspace(
    @GetWorkspaceFromRequest() workspace: Workspace,
    @Args('input') input: UpdateWorkspaceInput,
  ): Promise<WorkspaceResponse> {
    await this.workspacesService.update(workspace.id, input);
    return { ok: true };
  }

  @UseGuards(WorkspaceGuard)
  @Mutation(() => WorkspaceResponse)
  async deleteWorkspace(
    @GetWorkspaceFromRequest() workspace: Workspace,
  ): Promise<WorkspaceResponse> {
    await this.workspacesService.delete(workspace.id);
    return { ok: true };
  }

  @UseGuards(WorkspaceGuard)
  @Query(() => Workspace, { nullable: true })
  async currentWorkspace(
    @GetWorkspaceFromRequest() workspace: Workspace,
  ): Promise<Workspace | null> {
    return workspace;
  }

  @UseGuards(WorkspaceGuard)
  @Query(() => [WorkspaceStat])
  async workspaceStats(@GetWorkspaceFromRequest() workspace: Workspace): Promise<WorkspaceStat[]> {
    return this.workspacesService.getWorkspaceStats(workspace.id);
  }
}
