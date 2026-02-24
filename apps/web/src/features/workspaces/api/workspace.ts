import { graphql } from "@/gql";

export const ACTIVE_WORKSPACE_STORAGE_KEY = "activeWorkspaceId";

export const WORKSPACES_QUERY = graphql(`
  query GetWorkspaces {
    workspaces {
      id
      name
      color
      ownerId
      syncOperationsToProvider
      createdAt
      updatedAt
    }
  }
`);

export const CREATE_WORKSPACE_MUTATION = graphql(`
  mutation CreateWorkspace($input: CreateWorkspaceInput!) {
    createWorkspace(input: $input) {
      id
      name
      color
      ownerId
      createdAt
      updatedAt
    }
  }
`);

export const WORKSPACE_MEMBERS_QUERY = graphql(`
  query GetWorkspaceMembers($workspaceId: ID!) {
    workspaceMembers(workspaceId: $workspaceId) {
      userId
      name
      email
      role
      joinedAt
      isOwner
    }
  }
`);

export const WORKSPACE_INVITES_QUERY = graphql(`
  query GetWorkspaceInvites($workspaceId: ID!) {
    workspaceInvites(workspaceId: $workspaceId) {
      id
      token
      role
      expiresAt
      createdAt
    }
  }
`);

export const CREATE_WORKSPACE_INVITE_MUTATION = graphql(`
  mutation CreateWorkspaceInvite($input: CreateWorkspaceInviteInput!) {
    createWorkspaceInvite(input: $input) {
      id
      token
      role
      expiresAt
      createdAt
    }
  }
`);

export const UPDATE_WORKSPACE_MEMBER_ROLE_MUTATION = graphql(`
  mutation UpdateWorkspaceMemberRole($input: UpdateWorkspaceMemberRoleInput!) {
    updateWorkspaceMemberRole(input: $input)
  }
`);

export const UPDATE_WORKSPACE_NAME_MUTATION = graphql(`
  mutation UpdateWorkspaceName($input: UpdateWorkspaceNameInput!) {
    updateWorkspaceName(input: $input) {
      id
      name
      color
      ownerId
      syncOperationsToProvider
      createdAt
      updatedAt
    }
  }
`);

export const UPDATE_WORKSPACE_SYNC_OPERATIONS_MUTATION = graphql(`
  mutation UpdateWorkspaceSyncOperations($input: UpdateWorkspaceSyncOperationsInput!) {
    updateWorkspaceSyncOperations(input: $input) {
      id
      name
      color
      ownerId
      syncOperationsToProvider
      createdAt
      updatedAt
    }
  }
`);

export const REMOVE_WORKSPACE_MEMBER_MUTATION = graphql(`
  mutation RemoveWorkspaceMember($workspaceId: ID!, $userId: ID!) {
    removeWorkspaceMember(workspaceId: $workspaceId, userId: $userId)
  }
`);

export const REVOKE_WORKSPACE_INVITE_MUTATION = graphql(`
  mutation RevokeWorkspaceInvite($workspaceId: ID!, $inviteId: ID!) {
    revokeWorkspaceInvite(workspaceId: $workspaceId, inviteId: $inviteId)
  }
`);

export const ACCEPT_WORKSPACE_INVITE_MUTATION = graphql(`
  mutation AcceptWorkspaceInvite($token: String!) {
    acceptWorkspaceInvite(token: $token) {
      id
      name
      color
      ownerId
      syncOperationsToProvider
      createdAt
      updatedAt
    }
  }
`);
