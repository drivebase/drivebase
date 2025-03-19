import { File as DrivebaseFile, Provider } from '@prisma/client';
import type { FindWorkspaceFilesQuery } from '@drivebase/internal/files/files.service';
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@drivebase/react/lib/redux/base.query';
import { UploadFileDto } from '@drivebase/internal/files/dtos/upload.file.dto';
import { ApiResponse } from './api.type';

type FileWithProvider = DrivebaseFile & {
  fileProvider: Provider;
};

const filesApi = createApi({
  baseQuery,
  reducerPath: 'filesApi',
  tagTypes: ['files'],
  endpoints: (builder) => ({
    getFiles: builder.query<
      ApiResponse<FileWithProvider[]>,
      FindWorkspaceFilesQuery
    >({
      query: (query) => ({
        url: '/files',
        params: query,
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
      query: ({ files, providerId, path }) => {
        const formData = new FormData();

        formData.append('providerId', providerId);
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
      invalidatesTags: ['files'],
    }),
    starFile: builder.mutation<ApiResponse<DrivebaseFile>, string>({
      query: (id) => ({
        url: `/files/${id}`,
        method: 'PUT',
        body: { isStarred: true },
      }),
      invalidatesTags: ['files'],
    }),
    unstarFile: builder.mutation<ApiResponse<DrivebaseFile>, string>({
      query: (id) => ({
        url: `/files/${id}`,
        method: 'PUT',
        body: { isStarred: false },
      }),
      invalidatesTags: ['files'],
    }),
  }),
});

export const {
  useGetFilesQuery,
  useCreateFolderMutation,
  useUploadFileMutation,
  useStarFileMutation,
  useUnstarFileMutation,
} = filesApi;
export default filesApi;
