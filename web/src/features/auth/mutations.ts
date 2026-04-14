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

export const MeQuery = graphql(`
  query Me {
    me {
      id
      email
      name
    }
  }
`);
