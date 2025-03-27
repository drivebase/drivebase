import { gql } from '@drivebase/sdk';

export const RegisterUser = gql(`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      ok
    }
  }
`);

export const LoginUser = gql(`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
    }
  }
`);

export const ForgotPasswordSendCode = gql(`
  mutation ForgotPasswordSendCode($input: ForgotPasswordSendCodeInput!) {
    forgotPasswordSendCode(input: $input) {
      ok
    }
  }
`);

export const ForgotPasswordVerifyCode = gql(`
  mutation ForgotPasswordVerifyCode($input: ForgotPasswordVerifyCodeInput!) {
    forgotPasswordVerifyCode(input: $input) {
      ok
    }
  }
`);

export const ForgotPasswordReset = gql(`
  mutation ForgotPasswordReset($input: ForgotPasswordResetInput!) {
    forgotPasswordReset(input: $input) {
      ok
    }
  }
`);
