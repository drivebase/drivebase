import { gql } from '@drivebase/sdk';

export const REGISTER_USER = gql(`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      ok
    }
  }
`);

export const LOGIN_USER = gql(`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
    }
  }
`);

export const FORGOT_PASSWORD_SEND_CODE = gql(`
  mutation ForgotPasswordSendCode($input: ForgotPasswordSendCodeInput!) {
    forgotPasswordSendCode(input: $input) {
      ok
    }
  }
`);

export const FORGOT_PASSWORD_VERIFY_CODE = gql(`
  mutation ForgotPasswordVerifyCode($input: ForgotPasswordVerifyCodeInput!) {
    forgotPasswordVerifyCode(input: $input) {
      ok
    }
  }
`);

export const FORGOT_PASSWORD_RESET = gql(`
  mutation ForgotPasswordReset($input: ForgotPasswordResetInput!) {
    forgotPasswordReset(input: $input) {
      ok
    }
  }
`);
