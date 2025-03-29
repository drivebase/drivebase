import { gql } from '@drivebase/sdk';

export const GENERATE_UPLOAD_KEY = gql(`
  mutation GenerateUploadKey {
    generateUploadKey 
  }
`);

export const CREATE_FOLDER = gql(`
  mutation CreateFolder($input: CreateFolderInput!) {
    createFolder(input: $input) {
      id
    }
  }
`);

export const STAR_FILE = gql(`
  mutation StarFile($id: String!) {
    starFile(id: $id) {
      ok
    }
  }
`);

export const UNSTAR_FILE = gql(`
  mutation UnstarFile($id: String!) {
    unstarFile(id: $id) {
      ok
    }
  }
`);

export const RENAME_FILE = gql(`
  mutation RenameFile($id: String!, $name: String!) {
    renameFile(id: $id, name: $name) {
      ok
    }
  }
`);

export const DELETE_FILE = gql(`
  mutation DeleteFile($id: String!) {
    deleteFile(id: $id) {
      ok
    }
  }
`);
