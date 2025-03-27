import { gql } from '@drivebase/sdk';

export const CreateWorkspace = gql(`
  mutation CreateWorkspace($input: CreateWorkspaceInput!) {
    createWorkspace(input: $input) {
      id
    }
  }  
`);
