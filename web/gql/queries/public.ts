import { gql } from '@drivebase/sdk';

export const GetVersion = gql(`
  query GetVersion {
    version
  }
`);

export const Ping = gql(`
  query Ping {
    ping {
      time
      startedAt
    }
  }
`);
