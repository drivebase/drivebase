import { gql } from '@drivebase/sdk';

export const GET_ME = gql(`
  query GetMe {
    me {
      name
      email
    }
  }
`);
