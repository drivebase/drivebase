import { gql } from '@drivebase/sdk';

export const GET_FILES = gql(`
  query GetFiles($input: ListFilesInput!) {
    listFiles(input: $input) {
      data {
        id
        name
        path
        isFolder
        isStarred
        size
        mimeType
        createdAt
        updatedAt
      }
      meta {
        hasMore
        nextCursor
        prevCursor
        total
      }
    }
  }
`);
