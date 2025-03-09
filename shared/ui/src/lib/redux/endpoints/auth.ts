import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '@xilehq/ui/lib/redux/base.query';
import { CreateUserDto } from '@xilehq/internal/auth/dtos/create.user.dto';
import { LoginUserDto } from '@xilehq/internal/auth/dtos/login.user.dto';
import { UserPublicData } from '@xilehq/internal/users/users.validator';

const authApi = createApi({
  baseQuery,
  reducerPath: 'authApi',
  endpoints: (build) => ({
    register: build.mutation<void, CreateUserDto>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
    }),
    login: build.mutation<void, LoginUserDto>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
    }),
    profile: build.query<UserPublicData, void>({
      query: () => ({
        url: '/auth/profile',
        method: 'GET',
      }),
    }),
  }),
});

export const { useRegisterMutation, useLoginMutation, useProfileQuery } =
  authApi;
export default authApi;
