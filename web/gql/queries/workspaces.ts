import { gql } from '@drivebase/sdk';

export const GET_CURRENT_WORKSPACE = gql(`
  query GetCurrentWorkspace {
    currentWorkspace {
      id
    }
  }
`);

export const GET_WORKSPACES = gql(`
  query GetWorkspaces {
    workspaces {
      id
      name
      createdAt
    }
  }
`);

export const GET_WORKSPACE_STATS = gql(`
  query GetWorkspaceStats {
    workspaceStats {
      title
      count
      size
    }
  }
`);
