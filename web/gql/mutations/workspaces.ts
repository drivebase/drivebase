import { gql } from '@drivebase/sdk';

export const CREATE_WORKSPACE = gql(`
  mutation CreateWorkspace($input: CreateWorkspaceInput!) {
    createWorkspace(input: $input) {
      id
    }
  }  
`);
