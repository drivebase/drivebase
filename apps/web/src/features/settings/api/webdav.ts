import { graphql } from "@/gql";

export const WEBDAV_CREDENTIALS_QUERY = graphql(`
  query WebDavCredentials {
    webDavCredentials {
      id
      workspaceId
      userId
      userName
      userEmail
      name
      username
      providerScopes {
        providerId
        basePath
      }
      isActive
      lastUsedAt
      createdAt
      updatedAt
    }
  }
`);

export const CREATE_WEBDAV_CREDENTIAL_MUTATION = graphql(`
  mutation CreateWebDavCredential($input: CreateWebDavCredentialInput!) {
    createWebDavCredential(input: $input) {
      credential {
        id
        workspaceId
        userId
        userName
        userEmail
        name
        username
        providerScopes {
          providerId
          basePath
        }
        isActive
        lastUsedAt
        createdAt
        updatedAt
      }
      password
    }
  }
`);

export const REVOKE_WEBDAV_CREDENTIAL_MUTATION = graphql(`
  mutation RevokeWebDavCredential($id: ID!) {
    revokeWebDavCredential(id: $id)
  }
`);
