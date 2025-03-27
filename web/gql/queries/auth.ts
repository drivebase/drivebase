import { gql } from '@drivebase/sdk';

export const GetMe = gql(`
  query GetMe {
    me {
      name
    }
  }
`);
