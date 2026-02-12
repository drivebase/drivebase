import { graphql } from "@/gql";

export const GRANT_FOLDER_ACCESS_MUTATION = graphql(`
  mutation GrantFolderAccess($input: GrantAccessInput!) {
    grantFolderAccess(input: $input) {
      id
      folderId
      role
      user {
        ...UserItem
      }
      grantedByUser {
        ...UserItem
      }
      createdAt
    }
  }
`);

export const REVOKE_FOLDER_ACCESS_MUTATION = graphql(`
  mutation RevokeFolderAccess($folderId: ID!, $userId: ID!) {
    revokeFolderAccess(folderId: $folderId, userId: $userId)
  }
`);
