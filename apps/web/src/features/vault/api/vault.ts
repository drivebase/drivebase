import { graphql } from "@/gql";

export const MY_VAULT_QUERY = graphql(`
  query MyVault {
    myVault {
      id
      userId
      publicKey
      encryptedPrivateKey
      kekSalt
      createdAt
      updatedAt
    }
  }
`);

export const VAULT_CONTENTS_QUERY = graphql(`
  query VaultContents($path: String!) {
    vaultContents(path: $path) {
      files {
        id
        virtualPath
        name
        mimeType
        size
        providerId
        provider {
          id
          name
          type
        }
        folderId
        isDeleted
        starred
        createdAt
        updatedAt
      }
      folders {
        id
        virtualPath
        name
        parentId
        isDeleted
        starred
        createdAt
        updatedAt
      }
      folder {
        id
        virtualPath
        name
        parentId
      }
    }
  }
`);

export const SETUP_VAULT_MUTATION = graphql(`
  mutation SetupVault($input: SetupVaultInput!) {
    setupVault(input: $input) {
      id
      userId
      publicKey
      encryptedPrivateKey
      kekSalt
      createdAt
      updatedAt
    }
  }
`);

export const CHANGE_VAULT_PASSPHRASE_MUTATION = graphql(`
  mutation ChangeVaultPassphrase($input: ChangeVaultPassphraseInput!) {
    changeVaultPassphrase(input: $input) {
      id
      encryptedPrivateKey
      kekSalt
      updatedAt
    }
  }
`);

export const REQUEST_VAULT_UPLOAD_MUTATION = graphql(`
  mutation RequestVaultUpload($input: RequestVaultUploadInput!) {
    requestVaultUpload(input: $input) {
      fileId
      uploadUrl
      uploadFields
      useDirectUpload
    }
  }
`);

export const REQUEST_VAULT_DOWNLOAD_MUTATION = graphql(`
  mutation RequestVaultDownload($id: ID!) {
    requestVaultDownload(id: $id) {
      fileId
      downloadUrl
      useDirectDownload
      encryptedFileKey
    }
  }
`);

export const CREATE_VAULT_FOLDER_MUTATION = graphql(`
  mutation CreateVaultFolder($name: String!, $parentId: ID) {
    createVaultFolder(name: $name, parentId: $parentId) {
      id
      virtualPath
      name
      parentId
      createdAt
      updatedAt
    }
  }
`);

export const DELETE_VAULT_FILE_MUTATION = graphql(`
  mutation DeleteVaultFile($id: ID!) {
    deleteVaultFile(id: $id)
  }
`);

export const RENAME_VAULT_FILE_MUTATION = graphql(`
  mutation RenameVaultFile($id: ID!, $name: String!) {
    renameVaultFile(id: $id, name: $name) {
      id
      name
      virtualPath
      updatedAt
    }
  }
`);

export const STAR_VAULT_FILE_MUTATION = graphql(`
  mutation StarVaultFile($id: ID!) {
    starVaultFile(id: $id) {
      id
      starred
    }
  }
`);

export const UNSTAR_VAULT_FILE_MUTATION = graphql(`
  mutation UnstarVaultFile($id: ID!) {
    unstarVaultFile(id: $id) {
      id
      starred
    }
  }
`);

export const INITIATE_VAULT_CHUNKED_UPLOAD_MUTATION = graphql(`
  mutation InitiateVaultChunkedUpload($input: InitiateVaultChunkedUploadInput!) {
    initiateVaultChunkedUpload(input: $input) {
      sessionId
      totalChunks
      chunkSize
      useDirectUpload
      presignedPartUrls {
        partNumber
        url
      }
    }
  }
`);
