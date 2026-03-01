import { graphql } from "@/gql";

export const API_KEYS_QUERY = graphql(`
  query ApiKeys {
    apiKeys {
      id
      name
      description
      keyPrefix
      scopes
      expiresAt
      lastUsedAt
      isActive
      createdAt
      updatedAt
    }
  }
`);

export const CREATE_API_KEY_MUTATION = graphql(`
  mutation CreateApiKey($input: CreateApiKeyInput!) {
    createApiKey(input: $input) {
      apiKey {
        id
        name
        description
        keyPrefix
        scopes
        expiresAt
        isActive
        createdAt
        updatedAt
      }
      fullKey
    }
  }
`);

export const UPDATE_API_KEY_MUTATION = graphql(`
  mutation UpdateApiKey($id: ID!, $input: UpdateApiKeyInput!) {
    updateApiKey(id: $id, input: $input) {
      id
      name
      description
      keyPrefix
      scopes
      expiresAt
      lastUsedAt
      isActive
      createdAt
      updatedAt
    }
  }
`);

export const REVOKE_API_KEY_MUTATION = graphql(`
  mutation RevokeApiKey($id: ID!) {
    revokeApiKey(id: $id)
  }
`);
