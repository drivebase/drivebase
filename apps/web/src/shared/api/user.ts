import { graphql } from "@/gql";

export const USERS_QUERY = graphql(`
  query GetUsers($limit: Int, $offset: Int) {
    users(limit: $limit, offset: $offset) {
      ...UserItem
    }
  }
`);

export const USER_QUERY = graphql(`
  query GetUser($id: ID!) {
    user(id: $id) {
      ...UserItem
    }
  }
`);

export const UPDATE_USER_MUTATION = graphql(`
  mutation UpdateUser($id: ID!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
      ...UserItem
    }
  }
`);

export const DELETE_USER_MUTATION = graphql(`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`);
