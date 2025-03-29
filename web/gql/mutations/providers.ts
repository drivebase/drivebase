import { gql } from '@drivebase/sdk';

export const GET_AUTH_URL = gql(`
  mutation GetAuthUrl($input: GetAuthUrlInput!) {
    getAuthUrl(input: $input) {
      url
    }
  }
`);

export const AUTHORIZE_API_KEY = gql(`
  mutation AuthorizeApiKey($input: AuthorizeApiKeyInput!) {
    authorizeApiKey(input: $input) {
      id
    }
  }
`);

export const HANDLE_OAUTH_CALLBACK = gql(`
  mutation HandleOAuthCallback($input: HandleOAuthCallbackInput!) {
    handleOAuthCallback(input: $input) {
      id
    }
  }
`);

export const CONNECT_LOCAL_PROVIDER = gql(`
  mutation ConnectLocalProvider($input: ConnectLocalProviderInput!) {
    connectLocalProvider(input: $input) {
      id
    }
  }
`);
