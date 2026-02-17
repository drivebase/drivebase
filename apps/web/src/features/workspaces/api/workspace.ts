import { graphql } from "@/gql";

export const ACTIVE_WORKSPACE_STORAGE_KEY = "activeWorkspaceId";

export const WORKSPACES_QUERY = graphql(`
  query GetWorkspaces {
    workspaces {
      id
      name
      ownerId
      createdAt
      updatedAt
    }
  }
`);
