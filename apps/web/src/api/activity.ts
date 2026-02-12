import { graphql } from "@/gql";

export const ACTIVITIES_QUERY = graphql(`
  query GetActivities($limit: Int, $offset: Int) {
    activities(limit: $limit, offset: $offset) {
      id
      type
      userId
      metadata
      ipAddress
      userAgent
      createdAt
      user {
        ...UserItem
      }
      file {
        ...FileItem
      }
      folder {
        ...FolderItem
      }
      provider {
        id
        name
        type
      }
    }
  }
`);
