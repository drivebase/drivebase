import { graphql } from "@/gql";

export const ConnectProviderMutation = graphql(`
  mutation ConnectProvider($input: ConnectProviderInput!) {
    connectProvider(input: $input) {
      id
      name
      type
      status
    }
  }
`);

export const DisconnectProviderMutation = graphql(`
  mutation DisconnectProvider($id: UUID!) {
    disconnectProvider(id: $id)
  }
`);

export const InitiateOAuthMutation = graphql(`
  mutation InitiateOAuth($oauthAppID: UUID!, $providerName: String!) {
    initiateOAuth(oauthAppID: $oauthAppID, providerName: $providerName)
  }
`);

export const SaveOAuthAppMutation = graphql(`
  mutation SaveOAuthApp($input: SaveOAuthAppInput!) {
    saveOAuthApp(input: $input) {
      id
      providerType
      clientID
      alias
    }
  }
`);

export const ValidateProviderMutation = graphql(`
  mutation ValidateProvider($id: UUID!) {
    validateProvider(id: $id) {
      ok
      error
    }
  }
`);
