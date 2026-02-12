import { graphql } from "@/gql";

export const UserFragment = graphql(`
  fragment UserItem on User {
    id
    name
    email
    role
    isActive
    lastLoginAt
    createdAt
    updatedAt
  }
`);

export const FileFragment = graphql(`
  fragment FileItem on File {
    id
    virtualPath
    name
    mimeType
    size
    hash
    remoteId
    providerId
    folderId
    uploadedBy
    isDeleted
    starred
    createdAt
    updatedAt
    provider {
      id
      name
      type
    }
  }
`);

export const FolderFragment = graphql(`
  fragment FolderItem on Folder {
    id
    virtualPath
    name
    remoteId
    providerId
    parentId
    createdBy
    isDeleted
    starred
    createdAt
    updatedAt
  }
`);
