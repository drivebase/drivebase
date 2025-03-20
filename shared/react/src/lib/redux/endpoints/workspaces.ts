import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@drivebase/react/lib/redux/base.query';
import { CreateWorkspaceDto } from '@drivebase/internal/workspaces/dtos/create.workspace.dto';
import { Workspace } from '@prisma/client';

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
  }),
});

export const {
  useCreateWorkspaceMutation,
  useGetWorkspacesQuery,
  useGetCurrentWorkspaceQuery,
} = workspaceApi;
export default workspaceApi;
