import { graphql } from "@/gql";

export const FOLDER_QUERY = graphql(`
  query GetFolder($id: ID!) {
    folder(id: $id) {
      ...FolderItem
      children {
        ...FolderItem
      }
      files {
        ...FileItem
      }
      parent {
        ...FolderItem
      }
    }
  }
`);

export const FOLDERS_QUERY = graphql(`
  query GetFolders($parentId: ID, $providerIds: [ID!]) {
    folders(parentId: $parentId, providerIds: $providerIds) {
      ...FolderItem
    }
  }
`);

export const STARRED_FOLDERS_QUERY = graphql(`
  query GetStarredFolders {
    starredFolders {
      ...FolderItem
    }
  }
`);

export const CREATE_FOLDER_MUTATION = graphql(`
  mutation CreateFolder($input: CreateFolderInput!) {
    createFolder(input: $input) {
      ...FolderItem
    }
  }
`);

export const RENAME_FOLDER_MUTATION = graphql(`
  mutation RenameFolder($id: ID!, $name: String!) {
    renameFolder(id: $id, name: $name) {
      ...FolderItem
    }
  }
`);

export const MOVE_FOLDER_MUTATION = graphql(`
  mutation MoveFolder($id: ID!, $parentId: ID) {
    moveFolder(id: $id, parentId: $parentId) {
      ...FolderItem
    }
  }
`);

export const DELETE_FOLDER_MUTATION = graphql(`
  mutation DeleteFolder($id: ID!) {
    deleteFolder(id: $id)
  }
`);

export const STAR_FOLDER_MUTATION = graphql(`
  mutation StarFolder($id: ID!) {
    starFolder(id: $id) {
      ...FolderItem
    }
  }
`);

export const UNSTAR_FOLDER_MUTATION = graphql(`
  mutation UnstarFolder($id: ID!) {
    unstarFolder(id: $id) {
      ...FolderItem
    }
  }
`);
