import { File as DrivebaseFile } from '@prisma/client';
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@drivebase/react/lib/redux/base.query';
import { UploadFileDto } from '@drivebase/internal/files/dtos/upload.file.dto';
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
    uploadFile: builder.mutation<
      ApiResponse<DrivebaseFile>,
      UploadFileDto & {
        files: File[];
      }
    >({
      query: ({ files, accountId, path }) => {
        const formData = new FormData();

        formData.append('accountId', accountId);
        formData.append('path', path);

        files.forEach((file) => {
          formData.append('files', file);
        });

        return {
          url: '/files/upload',
          method: 'POST',
          body: formData,
        };
      },
    }),
  }),
});

export const {
  useGetFilesQuery,
  useCreateFolderMutation,
  useUploadFileMutation,
} = filesApi;
export default filesApi;
