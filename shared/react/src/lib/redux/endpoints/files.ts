import { File as DrivebaseFile } from '@prisma/client';
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@drivebase/react/lib/redux/base.query';
import { ApiResponse } from './api.type';

const filesApi = createApi({
  baseQuery,
  reducerPath: 'filesApi',
  tagTypes: ['files'],
  endpoints: (builder) => ({
    getFiles: builder.query<
      ApiResponse<DrivebaseFile[]>,
      {
        parentPath?: string;
      }
    >({
      query: ({ parentPath }) => ({
        url: '/files',
        params: { parentPath },
      }),
      providesTags: ['files'],
    }),
    createFolder: builder.mutation<
      ApiResponse<DrivebaseFile>,
      {
        name: string;
        parentPath: string;
      }
    >({
      query: ({ name, parentPath }) => ({
        url: '/files',
        method: 'POST',
        body: { name, parentPath, isFolder: true },
      }),
      invalidatesTags: ['files'],
    }),
  }),
});

export const { useGetFilesQuery, useCreateFolderMutation } = filesApi;
export default filesApi;
