import { graphql } from "@/gql";

export const PROVIDERS_QUERY = graphql(`
  query GetProviders {
    storageProviders {
      id
      name
      type
      authType
      isActive
      quotaUsed
      quotaTotal
      lastSyncAt
      createdAt
    }
  }
`);

export const PROVIDER_QUERY = graphql(`
  query GetStorageProvider($id: ID!) {
    storageProvider(id: $id) {
      id
      name
      type
      authType
      isActive
      accountEmail
      accountName
      configPreview {
        key
        value
        isSensitive
      }
      quotaUsed
      quotaTotal
      lastSyncAt
      createdAt
    }
  }
`);

export const CONNECT_PROVIDER_MUTATION = graphql(`
  mutation ConnectProvider($input: ConnectStorageInput!) {
    connectStorage(input: $input) {
      id
      name
      type
      authType
      isActive
      quotaUsed
      quotaTotal
    }
  }
`);

export const CREATE_OAUTH_PROVIDER_CREDENTIAL_MUTATION = graphql(`
    mutation CreateOAuthProviderCredential($input: CreateOAuthProviderCredentialInput!) {
      createOAuthProviderCredential(input: $input) {
        id
        type
        identifierLabel
        identifierValue
        createdAt
        updatedAt
      }
    }
  `);

export const OAUTH_PROVIDER_CREDENTIALS_QUERY = graphql(`
    query GetOAuthProviderCredentials($type: ProviderType!) {
      oauthProviderCredentials(type: $type) {
        id
        type
        identifierLabel
        identifierValue
        createdAt
        updatedAt
      }
    }
  `);

export const DISCONNECT_PROVIDER_MUTATION = graphql(`
  mutation DisconnectProvider($id: ID!) {
    disconnectProvider(id: $id)
  }
`);

export const SYNC_PROVIDER_MUTATION = graphql(`
  mutation SyncProvider($id: ID!, $options: SyncOptionsInput) {
    syncProvider(id: $id, options: $options) {
      id
      quotaTotal
      quotaUsed
      lastSyncAt
    }
  }
`);

export const UPDATE_PROVIDER_QUOTA_MUTATION = graphql(`
  mutation UpdateProviderQuota($input: UpdateProviderQuotaInput!) {
    updateProviderQuota(input: $input) {
      id
      quotaTotal
      quotaUsed
      updatedAt
    }
  }
`);

export const INITIATE_PROVIDER_OAUTH_MUTATION = graphql(`
  mutation InitiateProviderOAuth($id: ID!, $source: OAuthInitiator) {
    initiateProviderOAuth(id: $id, source: $source) {
      authorizationUrl
      state
    }
  }
`);

export const AVAILABLE_PROVIDERS_QUERY = graphql(`
  query GetAvailableProvidersForProvidersPage {
    availableProviders {
      id
      name
      description
      authType
      configFields {
        name
        label
        type
        required
        isIdentifier
        description
        placeholder
      }
    }
  }
`);

export const PROVIDER_SYNC_PROGRESS_SUBSCRIPTION = graphql(`
  subscription OnProviderSyncProgress($providerId: ID!) {
    providerSyncProgress(providerId: $providerId) {
      providerId
      processed
      total
      message
      status
    }
  }
`);
