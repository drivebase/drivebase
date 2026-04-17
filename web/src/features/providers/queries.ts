import { graphql } from "@/gql";

export const AvailableProvidersQuery = graphql(`
  query AvailableProviders {
    availableProviders {
      type
      label
      description
      authType
      fields {
        name
        label
        description
        placeholder
        required
      }
    }
  }
`);

export const ProvidersQuery = graphql(`
  query Providers {
    providers {
      id
      name
      type
      status
      authType
      createdAt
      quota {
        totalBytes
        freeBytes
      }
    }
  }
`);
