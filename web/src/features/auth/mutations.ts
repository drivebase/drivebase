import { graphql } from "@/gql";

export const SignInMutation = graphql(`
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        name
      }
    }
  }
`);

export const SignUpMutation = graphql(`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        name
      }
    }
  }
`);

export const SignOutMutation = graphql(`
  mutation SignOut {
    signOut
  }
`);

export const RequestPasswordResetMutation = graphql(`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`);

export const ResetPasswordMutation = graphql(`
  mutation ResetPassword($email: String!, $otp: String!, $newPassword: String!) {
    resetPassword(email: $email, otp: $otp, newPassword: $newPassword)
  }
`);

export const MeQuery = graphql(`
  query Me {
    me {
      id
      email
      name
    }
  }
`);
