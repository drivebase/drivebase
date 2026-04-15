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
