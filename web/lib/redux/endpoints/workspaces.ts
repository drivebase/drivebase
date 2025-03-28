import { baseQuery } from '@drivebase/web/lib/redux/base.query';
import { CreateWorkspaceDto } from '@drivebase/workspaces/dtos/create.workspace.dto';
import { WorkspaceStatDto } from '@drivebase/workspaces/dtos/workspace.stats.dto';
import { Workspace } from '@prisma/client';
import { createApi } from '@reduxjs/toolkit/query/react';

import { ApiResponse } from './api.type';

const workspaceApi = createApi({
  baseQuery,
  reducerPath: 'workspaceApi',
  endpoints: (build) => ({
    getCurrentWorkspace: build.query<{ data: Workspace }, void>({
      query: () => ({
        url: '/workspaces/current',
        method: 'GET',
      }),
    }),
    getWorkspaces: build.query<{ data: Workspace[] }, void>({
      query: () => ({
        url: '/workspaces',
        method: 'GET',
      }),
    }),
    createWorkspace: build.mutation<{ data: Workspace }, CreateWorkspaceDto>({
      query: (body) => ({
        url: '/workspaces',
        method: 'POST',
        body,
      }),
    }),
    getStats: build.query<ApiResponse<WorkspaceStatDto[]>, void>({
      query: () => ({
        url: '/workspaces/stats',
        method: 'GET',
      }),
    }),
  }),
});

export const {
  useCreateWorkspaceMutation,
  useGetWorkspacesQuery,
  useGetCurrentWorkspaceQuery,
  useGetStatsQuery,
} = workspaceApi;
export default workspaceApi;
