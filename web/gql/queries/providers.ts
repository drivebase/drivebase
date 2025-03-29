import { gql } from '@drivebase/sdk';

export const GET_AVAILABLE_PROVIDERS = gql(`
  query GetAvailableProviders {
    availableProviders {
      displayName
      authType
      type
      configSchema {
        fields {
          id
          type
          label
          description
          default
        }
        required
      }
    }
  }
`);

export const GET_CONNECTED_PROVIDERS = gql(`
  query GetConnectedProviders {
    connectedProviders {
      id
      name
      type
      authType
      metadata
      createdAt
    }
  }
`);

export const LIST_PROVIDER_FILES = gql(`
  query ListProviderFiles($input: ListProviderFilesInput!) {
    listProviderFiles(input: $input) {
      data {
        id
        name
        path
        size
        createdAt
        modifiedAt
        isFolder
        parentId
        parentPath
        thumbnail
      }
      meta {
        total
        hasMore
        nextCursor
        prevCursor
      }
    }
  }
`);
