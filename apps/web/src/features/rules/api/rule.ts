import { graphql } from "@/gql";

export const RULE_FOLDERS_QUERY = graphql(`
  query GetFoldersForRules {
    folders {
      id
      name
      virtualPath
    }
  }
`);

export const FILE_RULES_QUERY = graphql(`
  query GetFileRules {
    fileRules {
      id
      name
      priority
      enabled
      conditions
      destinationProviderId
      destinationFolderId
      destinationProvider {
        id
        name
        type
      }
      destinationFolder {
        id
        name
        virtualPath
      }
      createdAt
      updatedAt
    }
  }
`);

export const FILE_RULE_QUERY = graphql(`
  query GetFileRule($id: ID!) {
    fileRule(id: $id) {
      id
      name
      priority
      enabled
      conditions
      destinationProviderId
      destinationFolderId
      destinationProvider {
        id
        name
        type
      }
      destinationFolder {
        id
        name
        virtualPath
      }
      createdAt
      updatedAt
    }
  }
`);

export const CREATE_FILE_RULE_MUTATION = graphql(`
  mutation CreateFileRule($input: CreateFileRuleInput!) {
    createFileRule(input: $input) {
      id
      name
      priority
      enabled
      conditions
      destinationProviderId
      destinationFolderId
      destinationProvider {
        id
        name
        type
      }
      destinationFolder {
        id
        name
        virtualPath
      }
      createdAt
      updatedAt
    }
  }
`);

export const UPDATE_FILE_RULE_MUTATION = graphql(`
  mutation UpdateFileRule($id: ID!, $input: UpdateFileRuleInput!) {
    updateFileRule(id: $id, input: $input) {
      id
      name
      priority
      enabled
      conditions
      destinationProviderId
      destinationFolderId
      destinationProvider {
        id
        name
        type
      }
      destinationFolder {
        id
        name
        virtualPath
      }
      createdAt
      updatedAt
    }
  }
`);

export const DELETE_FILE_RULE_MUTATION = graphql(`
  mutation DeleteFileRule($id: ID!) {
    deleteFileRule(id: $id)
  }
`);

export const REORDER_FILE_RULES_MUTATION = graphql(`
  mutation ReorderFileRules($orderedIds: [ID!]!) {
    reorderFileRules(orderedIds: $orderedIds) {
      id
      name
      priority
      enabled
      conditions
      destinationProviderId
      destinationFolderId
      destinationProvider {
        id
        name
        type
      }
      destinationFolder {
        id
        name
        virtualPath
      }
      createdAt
      updatedAt
    }
  }
`);
