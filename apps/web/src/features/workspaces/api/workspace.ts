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

export const WORKSPACE_AI_SETTINGS_QUERY = graphql(`
  query GetWorkspaceAiSettings($workspaceId: ID!) {
    workspaceAiSettings(workspaceId: $workspaceId) {
      workspaceId
      enabled
      modelsReady
      embeddingTier
      ocrTier
      maxConcurrency
      config
      updatedAt
    }
  }
`);

export const WORKSPACE_AI_PROGRESS_QUERY = graphql(`
  query GetWorkspaceAiProgress($workspaceId: ID!) {
    workspaceAiProgress(workspaceId: $workspaceId) {
      workspaceId
      eligibleFiles
      processedFiles
      pendingFiles
      runningFiles
      failedFiles
      skippedFiles
      completedFiles
      completionPct
      updatedAt
    }
  }
`);

export const WORKSPACE_AI_PROGRESS_UPDATED_SUBSCRIPTION = graphql(`
  subscription WorkspaceAiProgressUpdated($workspaceId: ID!) {
    workspaceAiProgressUpdated(workspaceId: $workspaceId) {
      workspaceId
      eligibleFiles
      processedFiles
      pendingFiles
      runningFiles
      failedFiles
      skippedFiles
      completedFiles
      completionPct
      updatedAt
    }
  }
`);

export const UPDATE_WORKSPACE_AI_SETTINGS_MUTATION = graphql(`
  mutation UpdateWorkspaceAiSettings($input: UpdateWorkspaceAiSettingsInput!) {
    updateWorkspaceAiSettings(input: $input) {
      workspaceId
      enabled
      modelsReady
      embeddingTier
      ocrTier
      maxConcurrency
      config
      updatedAt
    }
  }
`);

export const PREPARE_WORKSPACE_AI_MODELS_MUTATION = graphql(`
  mutation PrepareWorkspaceAiModels($workspaceId: ID!, $tasks: [AiModelTask!]) {
    prepareWorkspaceAiModels(workspaceId: $workspaceId, tasks: $tasks)
  }
`);

export const START_WORKSPACE_AI_PROCESSING_MUTATION = graphql(`
  mutation StartWorkspaceAiProcessing($workspaceId: ID!) {
    startWorkspaceAiProcessing(workspaceId: $workspaceId)
  }
`);

export const STOP_WORKSPACE_AI_PROCESSING_MUTATION = graphql(`
  mutation StopWorkspaceAiProcessing($workspaceId: ID!) {
    stopWorkspaceAiProcessing(workspaceId: $workspaceId)
  }
`);

export const DELETE_WORKSPACE_AI_DATA_MUTATION = graphql(`
  mutation DeleteWorkspaceAiData($workspaceId: ID!) {
    deleteWorkspaceAiData(workspaceId: $workspaceId)
  }
`);

export const RETRY_WORKSPACE_AI_FAILED_FILES_MUTATION = graphql(`
  mutation RetryWorkspaceAiFailedFiles($workspaceId: ID!) {
    retryWorkspaceAiFailedFiles(workspaceId: $workspaceId)
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
