import { graphql } from "@/gql";

export const FILES_QUERY = graphql(`
  query GetFiles($folderId: ID, $limit: Int, $offset: Int) {
    files(folderId: $folderId, limit: $limit, offset: $offset) {
      files {
        ...FileItem
      }
      total
      hasMore
    }
  }
`);

export const CONTENTS_QUERY = graphql(`
  query GetContents($folderId: ID, $providerIds: [ID!]) {
    contents(folderId: $folderId, providerIds: $providerIds) {
      files {
        ...FileItem
      }
      folders {
        ...FolderItem
      }
      folder {
        ...FolderItem
      }
    }
  }
`);

export const FILE_QUERY = graphql(`
  query GetFile($id: ID!) {
    file(id: $id) {
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
      user {
        id
        email
      }
    }
  }
`);

export const SEARCH_FILES_QUERY = graphql(`
  query SearchFiles($query: String!, $limit: Int) {
    searchFiles(query: $query, limit: $limit) {
      ...FileItem
    }
  }
`);

export const SEARCH_FOLDERS_QUERY = graphql(`
  query SearchFolders($query: String!, $limit: Int) {
    searchFolders(query: $query, limit: $limit) {
      ...FolderItem
    }
  }
`);

export const RECENT_FILES_QUERY = graphql(`
  query RecentFiles($limit: Int) {
    recentFiles(limit: $limit) {
      ...FileItem
    }
  }
`);

export const STARRED_FILES_QUERY = graphql(`
  query GetStarredFiles {
    starredFiles {
      ...FileItem
    }
  }
`);

export const REQUEST_UPLOAD_MUTATION = graphql(`
  mutation RequestUpload($input: RequestUploadInput!) {
    requestUpload(input: $input) {
      fileId
      uploadUrl
      uploadFields
      useDirectUpload
    }
  }
`);

export const REQUEST_DOWNLOAD_MUTATION = graphql(`
  mutation RequestDownload($id: ID!) {
    requestDownload(id: $id) {
      fileId
      downloadUrl
      useDirectDownload
    }
  }
`);

export const RENAME_FILE_MUTATION = graphql(`
  mutation RenameFile($id: ID!, $name: String!) {
    renameFile(id: $id, name: $name) {
      ...FileItem
    }
  }
`);

export const MOVE_FILE_MUTATION = graphql(`
  mutation MoveFile($id: ID!, $folderId: ID) {
    moveFile(id: $id, folderId: $folderId) {
      ...FileItem
    }
  }
`);

export const MOVE_FILE_TO_PROVIDER_MUTATION = graphql(`
  mutation MoveFileToProvider($id: ID!, $providerId: ID!) {
    moveFileToProvider(id: $id, providerId: $providerId) {
      ...FileItem
    }
  }
`);

export const DELETE_FILE_MUTATION = graphql(`
  mutation DeleteFile($id: ID!) {
    deleteFile(id: $id)
  }
`);

export const STAR_FILE_MUTATION = graphql(`
  mutation StarFile($id: ID!) {
    starFile(id: $id) {
      ...FileItem
    }
  }
`);

export const UNSTAR_FILE_MUTATION = graphql(`
  mutation UnstarFile($id: ID!) {
    unstarFile(id: $id) {
      ...FileItem
    }
  }
`);
