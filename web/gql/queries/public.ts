import { gql } from '@drivebase/sdk';

export const GET_VERSION = gql(`
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
