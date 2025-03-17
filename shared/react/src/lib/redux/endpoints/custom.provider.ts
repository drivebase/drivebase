import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQuery } from '../base.query';
import {
  TelegramSendCodeDto,
  TelegramVerifyCodeDto,
  TelegramVerifyPasswordDto,
} from '@drivebase/internal/providers/custom/telegram/telegram.dto';
import { ApiResponse } from './api.type';

type TelegramVerifyCodeResponse = {
  next?: string;
};

export const customProviderApi = createApi({
  reducerPath: 'customProviderApi',
  baseQuery,
  endpoints: (builder) => ({
    telegramSendCode: builder.mutation<ApiResponse<void>, TelegramSendCodeDto>({
      query: (body) => ({
        url: '/custom-provider/telegram/send-code',
        method: 'POST',
        body,
      }),
    }),
    telegramVerifyCode: builder.mutation<
      ApiResponse<TelegramVerifyCodeResponse>,
      TelegramVerifyCodeDto
    >({
      query: (body) => ({
        url: '/custom-provider/telegram/verify-code',
        method: 'POST',
        body,
      }),
    }),
    telegramVerifyPassword: builder.mutation<
      ApiResponse<void>,
      TelegramVerifyPasswordDto
    >({
      query: (body) => ({
        url: '/custom-provider/telegram/verify-password',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useTelegramSendCodeMutation,
  useTelegramVerifyCodeMutation,
  useTelegramVerifyPasswordMutation,
} = customProviderApi;
export default customProviderApi;
