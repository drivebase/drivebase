import { graphql } from "@/gql";

export const ME_QUERY = graphql(`
  query Me {
    me {
      ...UserItem
    }
  }
`);

export const LOGIN_MUTATION = graphql(`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      workspaceId
      workspaceRole
      user {
        ...UserItem
      }
    }
  }
`);

export const REGISTER_MUTATION = graphql(`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      workspaceId
      workspaceRole
      user {
        ...UserItem
      }
    }
  }
`);

export const LOGOUT_MUTATION = graphql(`
  mutation Logout {
    logout
  }
`);

export const REQUEST_PASSWORD_RESET_MUTATION = graphql(`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email)
  }
`);

export const RESET_PASSWORD_MUTATION = graphql(`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input)
  }
`);

export const CHANGE_PASSWORD_MUTATION = graphql(`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input)
  }
`);

export const UPDATE_MY_PROFILE_MUTATION = graphql(`
  mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      ...UserItem
    }
  }
`);
