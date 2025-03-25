import { CreateUserDto } from '@drivebase/auth/dtos/create.user.dto';
import { LoginUserDto } from '@drivebase/auth/dtos/login.user.dto';
import { UserPublicData } from '@drivebase/users/users.validator';
import { baseQuery } from '@drivebase/web/lib/redux/base.query';
import { createApi } from '@reduxjs/toolkit/query/react';

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
