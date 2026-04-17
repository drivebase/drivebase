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
