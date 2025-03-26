import { CreateUserDto } from '@drivebase/auth/dtos/create.user.dto';
import {
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyForgotCodeDto,
} from '@drivebase/auth/dtos/forgot.password.dto';
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
    forgotPassswordSendCode: build.mutation<void, ForgotPasswordDto>({
      query: (body) => ({
        url: '/auth/forgot-password/send-code',
        method: 'POST',
        body,
      }),
    }),
    forgotPassswordVerifyCode: build.mutation<void, VerifyForgotCodeDto>({
      query: (body) => ({
        url: '/auth/forgot-password/verify-code',
        method: 'POST',
        body,
      }),
    }),
    forgotPassswordReset: build.mutation<void, ResetPasswordDto>({
      query: (body) => ({
        url: '/auth/forgot-password/reset',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useProfileQuery,
  useForgotPassswordSendCodeMutation,
  useForgotPassswordVerifyCodeMutation,
  useForgotPassswordResetMutation,
} = authApi;
export default authApi;
