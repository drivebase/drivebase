import { graphql } from "@/gql";

export const OAuthAppsQuery = graphql(`
  query OAuthApps {
    oauthApps {
      id
      providerType
      clientID
      alias
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
      createdAt
      quota {
        totalBytes
        usedBytes
        freeBytes
        syncedAt
      }
    }
  }
`);

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
        type
        required
        placeholder
        description
        secret
      }
    }
  }
`);
