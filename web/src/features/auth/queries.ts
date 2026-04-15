import { graphql } from "@/gql";

export const MeQuery = graphql(`
  query Me {
    me {
      id
      email
      name
    }
  }
`);
