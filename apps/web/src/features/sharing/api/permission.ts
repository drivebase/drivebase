import { graphql } from "@/gql";

export const SHARED_WITH_ME_QUERY = graphql(`
  query GetSharedWithMe {
    sharedWithMe {
      ...FolderItem
      permissions {
        id
        role
        userId
        grantedBy
        createdAt
      }
    }
  }
`);

export const GET_FOLDER_PERMISSIONS_QUERY = graphql(`
  query GetFolderPermissions($id: ID!) {
    folder(id: $id) {
      id
      name
      permissions {
        id
        role
        userId
        grantedBy
        user {
          ...UserItem
        }
        grantedByUser {
          ...UserItem
        }
        createdAt
        updatedAt
      }
    }
  }
`);
