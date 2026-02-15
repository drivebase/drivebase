import { graphql } from "@/gql";

export const APP_METADATA_QUERY = graphql(`
  query GetAppMetadata {
    appMetadata {
      version
    }
  }
`);
