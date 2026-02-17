import { graphql } from "@/gql";

export const ACTIVE_WORKSPACE_STORAGE_KEY = "activeWorkspaceId";

export const WORKSPACES_QUERY = graphql(`
  query GetWorkspaces {
    workspaces {
      id
      name
      color
      ownerId
      createdAt
      updatedAt
    }
  }
`);

export const CREATE_WORKSPACE_MUTATION = graphql(`
  mutation CreateWorkspace($input: CreateWorkspaceInput!) {
    createWorkspace(input: $input) {
      id
      name
      color
      ownerId
      createdAt
      updatedAt
    }
  }
`);
