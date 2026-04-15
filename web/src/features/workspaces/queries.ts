import { graphql } from "@/gql";

export const MyWorkspacesQuery = graphql(`
  query MyWorkspaces {
    myWorkspaces {
      id
      name
      slug
    }
  }
`);

export const SwitchWorkspaceMutation = graphql(`
  mutation SwitchWorkspace($workspaceID: UUID!) {
    switchWorkspace(workspaceID: $workspaceID) {
      accessToken
    }
  }
`);

export const CreateWorkspaceMutation = graphql(`
  mutation CreateWorkspace($input: CreateWorkspaceInput!) {
    createWorkspace(input: $input) {
      id
      name
      slug
    }
  }
`);
