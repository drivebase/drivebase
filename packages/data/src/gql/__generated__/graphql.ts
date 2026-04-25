/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: string | number; output: string | number; }
  DateTime: { input: string; output: string; }
  JSON: { input: unknown; output: unknown; }
};

export type AppMetadata = {
  __typename?: 'AppMetadata';
  version: Scalars['String']['output'];
};

/**
 * Start a provider-agnostic OAuth connect flow. The server resolves the
 * provider type from the oauth app and uses its registered OAuth module
 * to build the authorize URL. The `state` is bound to the viewer in Redis
 * (10 min TTL) and must be replayed verbatim to completeProviderOAuth.
 */
export type BeginProviderOAuthInput = {
  label: Scalars['String']['input'];
  oauthAppId: Scalars['ID']['input'];
};

export type BeginProviderOAuthPayload = {
  __typename?: 'BeginProviderOAuthPayload';
  authorizeUrl: Scalars['String']['output'];
  state: Scalars['String']['output'];
};

/**
 * Complete an OAuth connect flow. The server looks up the stashed state,
 * exchanges the code for tokens, probes authentication, and persists the
 * provider row with encrypted credentials.
 */
export type CompleteProviderOAuthInput = {
  code: Scalars['String']['input'];
  state: Scalars['String']['input'];
};

export type CompleteUploadSessionInput = {
  /** Required in direct mode; must have exactly totalChunks entries. */
  parts?: InputMaybe<Array<UploadPartInput>>;
  sessionId: Scalars['ID']['input'];
};

export type ConflictAction =
  | 'overwrite'
  | 'rename'
  | 'skip';

/** A file/folder conflict discovered by a worker at write time. */
export type ConflictDiscoveredEvent = {
  __typename?: 'ConflictDiscoveredEvent';
  conflictId: Scalars['ID']['output'];
  existingType: NodeType;
  incomingType: NodeType;
  jobId: Scalars['ID']['output'];
  operationId: Scalars['ID']['output'];
  path: Scalars['String']['output'];
};

export type ConflictStrategy =
  | 'ask'
  | 'error'
  | 'overwrite'
  | 'rename'
  | 'skip';

/**
 * Credentials blob at connect time. Shape depends on the provider type —
 * validated server-side by the provider module.
 */
export type ConnectProviderInput = {
  credentials: Scalars['JSON']['input'];
  label: Scalars['String']['input'];
  type: Scalars['String']['input'];
};

/**
 * Same-provider copy. All `srcNodeIds` must live on the same provider as the
 * destination parent. Non-empty.
 */
export type CopyTreePreflightInput = {
  dstParentId?: InputMaybe<Scalars['ID']['input']>;
  srcNodeIds: Array<Scalars['ID']['input']>;
  strategy: ConflictStrategy;
};

export type CreateOAuthAppInput = {
  clientId: Scalars['String']['input'];
  clientSecret: Scalars['String']['input'];
  label: Scalars['String']['input'];
  provider: Scalars['String']['input'];
};

/** Batched delete. All `srcNodeIds` must share one provider. Non-empty. */
export type DeleteTreePreflightInput = {
  srcNodeIds: Array<Scalars['ID']['input']>;
};

export type ExecuteResult = {
  __typename?: 'ExecuteResult';
  jobIds: Array<Scalars['ID']['output']>;
  operationId: Scalars['ID']['output'];
};

export type InitiateUploadSessionInput = {
  /** Optional override of config.uploads.defaultChunkSizeBytes (8 MiB by default). */
  chunkSizeBytes?: InputMaybe<Scalars['Int']['input']>;
  /** Must reference a `ready` upload operation with one or more upload entries. */
  operationId: Scalars['ID']['input'];
};

/**
 * Returned by `initiateUploadSession`. Clients switch on `session.mode`:
 *   - `proxy`  → PUT each chunk to `chunkUploadUrlPattern` with `{index}`
 *               substituted by its 0-based chunk number.
 *   - `direct` → PUT each chunk to the matching `presignedParts[i].url`;
 *               collect the response ETag and pass the whole list back
 *               through `completeUploadSession.parts`.
 */
export type InitiateUploadSessionPayload = {
  __typename?: 'InitiateUploadSessionPayload';
  sessions: Array<InitiatedUploadSession>;
};

export type InitiatedUploadSession = {
  __typename?: 'InitiatedUploadSession';
  /** Non-null in proxy mode. */
  chunkUploadUrlPattern: Maybe<Scalars['String']['output']>;
  /** Non-null in direct mode; ordered by partNumber (1-based, contiguous). */
  presignedParts: Maybe<Array<PresignedPart>>;
  session: UploadSession;
};

export type JobStatus =
  | 'failed'
  | 'running'
  | 'skipped'
  | 'succeeded';

/** Per-job lifecycle transition. Fires on running / succeeded / failed / skipped. */
export type JobStatusEvent = {
  __typename?: 'JobStatusEvent';
  error: Maybe<Scalars['String']['output']>;
  jobId: Scalars['ID']['output'];
  operationId: Scalars['ID']['output'];
  status: JobStatus;
};

/**
 * Client-side local tree node — used for upload preflights. The orchestrator
 * walks this tree to materialize paths and emit createFolder/upload entries.
 */
export type LocalTreeNodeInput = {
  children?: InputMaybe<Array<LocalTreeNodeInput>>;
  clientRef?: InputMaybe<Scalars['String']['input']>;
  mimeType?: InputMaybe<Scalars['String']['input']>;
  name: Scalars['String']['input'];
  size?: InputMaybe<Scalars['BigInt']['input']>;
  type: NodeType;
};

/** Same-provider move. All `srcNodeIds` must share one provider. Non-empty. */
export type MoveTreePreflightInput = {
  dstParentId?: InputMaybe<Scalars['ID']['input']>;
  srcNodeIds: Array<Scalars['ID']['input']>;
  strategy: ConflictStrategy;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Begin a provider-agnostic OAuth connect flow. Returns a URL to redirect the user to. */
  beginProviderOAuth: BeginProviderOAuthPayload;
  /** Mark an operation cancelled. No-op if already terminal. */
  cancelOperation: Operation;
  /** Abort a session: cleans staging (proxy) or fires AbortMultipartUpload (direct). */
  cancelUploadSession: UploadSession;
  /** Complete an OAuth connect flow. Creates the Provider row after a successful token exchange. */
  completeProviderOAuth: Provider;
  /** Mark a session ready after all chunks/parts are in flight. */
  completeUploadSession: UploadSession;
  /** Connect a new storage provider. Credentials are AES-256-GCM encrypted at rest. */
  connectProvider: Provider;
  /** Create a folder under a provider parent (or root when parentId is null). */
  createFolder: Node;
  /** Create an OAuth app. The client secret is encrypted at rest with the server master key. */
  createOAuthApp: OAuthApp;
  /** Delete an OAuth app. Rejected when a provider is still bound to it. */
  deleteOAuthApp: Scalars['Boolean']['output'];
  /** Disconnect (delete) a provider. Cascades to nodes and usage rows. */
  disconnectProvider: Scalars['Boolean']['output'];
  /** Flip a ready operation to running and enqueue one job per entry. */
  executePlan: ExecuteResult;
  /** Initiate byte transport for a ready upload operation. */
  initiateUploadSession: InitiateUploadSessionPayload;
  /** Build a plan (no conflict detection). Returns summary and entries. */
  preflight: PreflightResult;
  /** Force a usage refresh for a single provider by calling its live getUsage(). */
  refreshUsage: Usage;
  /** Rename a node in place without changing its parent. */
  renameNode: Node;
  /** Resolve a runtime conflict discovered by a worker. applyToAll writes a blanket decision. */
  resolveConflict: Operation;
  triggerAppUpdate: UpdateStatus;
};


export type MutationBeginProviderOAuthArgs = {
  input: BeginProviderOAuthInput;
};


export type MutationCancelOperationArgs = {
  operationId: Scalars['ID']['input'];
};


export type MutationCancelUploadSessionArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCompleteProviderOAuthArgs = {
  input: CompleteProviderOAuthInput;
};


export type MutationCompleteUploadSessionArgs = {
  input: CompleteUploadSessionInput;
};


export type MutationConnectProviderArgs = {
  input: ConnectProviderInput;
};


export type MutationCreateFolderArgs = {
  name: Scalars['String']['input'];
  parentId: InputMaybe<Scalars['ID']['input']>;
  providerId: Scalars['ID']['input'];
};


export type MutationCreateOAuthAppArgs = {
  input: CreateOAuthAppInput;
};


export type MutationDeleteOAuthAppArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDisconnectProviderArgs = {
  id: Scalars['ID']['input'];
};


export type MutationExecutePlanArgs = {
  operationId: Scalars['ID']['input'];
};


export type MutationInitiateUploadSessionArgs = {
  input: InitiateUploadSessionInput;
};


export type MutationPreflightArgs = {
  input: PreflightInput;
};


export type MutationRefreshUsageArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRenameNodeArgs = {
  newName: Scalars['String']['input'];
  nodeId: Scalars['ID']['input'];
};


export type MutationResolveConflictArgs = {
  action: ConflictAction;
  applyToAll: InputMaybe<Scalars['Boolean']['input']>;
  conflictId: Scalars['ID']['input'];
};


export type MutationTriggerAppUpdateArgs = {
  version: InputMaybe<Scalars['String']['input']>;
};

export type Node = {
  __typename?: 'Node';
  checksum: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  mimeType: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  parentId: Maybe<Scalars['ID']['output']>;
  pathText: Scalars['String']['output'];
  providerId: Scalars['ID']['output'];
  remoteCreatedAt: Maybe<Scalars['DateTime']['output']>;
  remoteId: Scalars['String']['output'];
  remoteUpdatedAt: Maybe<Scalars['DateTime']['output']>;
  size: Maybe<Scalars['BigInt']['output']>;
  syncedAt: Scalars['DateTime']['output'];
  type: NodeType;
};

export type NodePage = {
  __typename?: 'NodePage';
  nextPageToken: Maybe<Scalars['String']['output']>;
  nodes: Array<Node>;
};

export type NodeType =
  | 'file'
  | 'folder';

export type OAuthApp = {
  __typename?: 'OAuthApp';
  clientId: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  provider: Scalars['String']['output'];
};

export type Operation = {
  __typename?: 'Operation';
  completedAt: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  entries: Array<PlanEntry>;
  error: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  jobCounts: OperationJobCounts;
  kind: OperationKind;
  status: OperationStatus;
  strategy: ConflictStrategy;
  summary: Maybe<OperationSummary>;
  updatedAt: Scalars['DateTime']['output'];
};

/** Per-status job counts for a single operation. */
export type OperationJobCounts = {
  __typename?: 'OperationJobCounts';
  cancelled: Scalars['Int']['output'];
  failed: Scalars['Int']['output'];
  queued: Scalars['Int']['output'];
  running: Scalars['Int']['output'];
  skipped: Scalars['Int']['output'];
  succeeded: Scalars['Int']['output'];
  total: Scalars['Int']['output'];
};

export type OperationKind =
  | 'copy_tree'
  | 'delete_tree'
  | 'download'
  | 'move_tree'
  | 'transfer'
  | 'upload';

export type OperationLifecycleStatus =
  | 'cancelled'
  | 'failed'
  | 'running'
  | 'succeeded';

/** Union of all operation-progress event kinds. Clients switch on __typename. */
export type OperationProgress = ConflictDiscoveredEvent | JobStatusEvent | OperationStatusEvent | ProgressEvent;

export type OperationStatus =
  | 'cancelled'
  | 'failed'
  | 'planning'
  | 'ready'
  | 'running'
  | 'succeeded';

/** Terminal transition for the whole operation. Fires exactly once. */
export type OperationStatusEvent = {
  __typename?: 'OperationStatusEvent';
  operationId: Scalars['ID']['output'];
  status: OperationLifecycleStatus;
};

export type OperationSummary = {
  __typename?: 'OperationSummary';
  conflicts: Scalars['Int']['output'];
  totalBytes: Scalars['BigInt']['output'];
  totalEntries: Scalars['Int']['output'];
};

export type PlanEntry = {
  __typename?: 'PlanEntry';
  dstName: Scalars['String']['output'];
  dstPath: Scalars['String']['output'];
  kind: Scalars['String']['output'];
  size: Maybe<Scalars['BigInt']['output']>;
  srcName: Maybe<Scalars['String']['output']>;
  srcPath: Maybe<Scalars['String']['output']>;
};

/**
 * Exactly one of the five preflight inputs must be set. The orchestrator
 * dispatches on the one that's non-null.
 */
export type PreflightInput = {
  copyTree?: InputMaybe<CopyTreePreflightInput>;
  deleteTree?: InputMaybe<DeleteTreePreflightInput>;
  moveTree?: InputMaybe<MoveTreePreflightInput>;
  transfer?: InputMaybe<TransferPreflightInput>;
  upload?: InputMaybe<UploadPreflightInput>;
};

export type PreflightResult = {
  __typename?: 'PreflightResult';
  entries: Array<PlanEntry>;
  id: Scalars['ID']['output'];
  operationId: Scalars['ID']['output'];
  status: OperationStatus;
  summary: OperationSummary;
};

export type PresignedPart = {
  __typename?: 'PresignedPart';
  partNumber: Scalars['Int']['output'];
  url: Scalars['String']['output'];
};

/** Throttled byte-level progress. One per ~256 KiB or 500 ms per job. */
export type ProgressEvent = {
  __typename?: 'ProgressEvent';
  bytes: Scalars['BigInt']['output'];
  entryKind: Scalars['String']['output'];
  jobId: Scalars['ID']['output'];
  operationId: Scalars['ID']['output'];
  sizeBytes: Maybe<Scalars['BigInt']['output']>;
};

export type Provider = {
  __typename?: 'Provider';
  authKind: ProviderAuthKind;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  lastError: Maybe<Scalars['String']['output']>;
  oauthAppId: Maybe<Scalars['ID']['output']>;
  status: ProviderStatus;
  type: Scalars['String']['output'];
  usage: Maybe<Usage>;
};

export type ProviderAuthKind =
  | 'api_key'
  | 'credentials'
  | 'none'
  | 'oauth';

export type ProviderCapabilities = {
  __typename?: 'ProviderCapabilities';
  isHierarchical: Scalars['Boolean']['output'];
  supportsChecksum: Scalars['Boolean']['output'];
  supportsDelta: Scalars['Boolean']['output'];
  supportsMultipartUpload: Scalars['Boolean']['output'];
  supportsNativeCopy: Scalars['Boolean']['output'];
  supportsNativeMove: Scalars['Boolean']['output'];
  supportsPresignedUploadParts: Scalars['Boolean']['output'];
};

/**
 * UI schema for a single credential input on the connect form. `key` is the
 * property name the frontend puts into `ConnectProviderInput.credentials`.
 */
export type ProviderCredentialField = {
  __typename?: 'ProviderCredentialField';
  helpText: Maybe<Scalars['String']['output']>;
  key: Scalars['String']['output'];
  label: Scalars['String']['output'];
  placeholder: Maybe<Scalars['String']['output']>;
  required: Scalars['Boolean']['output'];
  type: ProviderFieldType;
};

export type ProviderFieldType =
  | 'password'
  | 'text'
  | 'url';

export type ProviderStatus =
  | 'connected'
  | 'disconnected'
  | 'error';

/**
 * Catalogued provider type exposed by the server. Drives the UI connect flow:
 * the frontend queries this to render a provider picker and — for non-OAuth
 * providers — a credentials form generated from `credentialFields`.
 */
export type ProviderType = {
  __typename?: 'ProviderType';
  authKind: ProviderAuthKind;
  capabilities: ProviderCapabilities;
  /**
   * Fields the UI should render for the connect form. Empty when
   * `authKind === oauth` (the user authenticates via the authorize URL
   * instead of a form).
   */
  credentialFields: Array<ProviderCredentialField>;
  label: Scalars['String']['output'];
  type: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  appMetadata: AppMetadata;
  /**
   * List children of a node on a provider. Hits the local Nodes cache first
   * (TTL 60s); `force: true` bypasses and re-lists from the live provider.
   */
  listChildren: NodePage;
  /** OAuth app registrations owned by the viewer. */
  myOAuthApps: Array<OAuthApp>;
  /** Operations owned by the viewer, newest first. */
  myOperations: Array<Operation>;
  /** Providers connected by the viewer. */
  myProviders: Array<Provider>;
  /** Fetch a single operation the viewer owns. */
  operation: Maybe<Operation>;
  /** A single provider by id, scoped to the viewer. */
  provider: Maybe<Provider>;
  /** Provider types the server knows how to run. */
  providerTypes: Array<ProviderType>;
  transferStats: Maybe<TransferStats>;
  updateStatus: UpdateStatus;
  /** Single upload session by id, scoped to the viewer. */
  uploadSession: Maybe<UploadSession>;
  /** Non-terminal upload sessions for the viewer (pending / uploading / ready). */
  uploadSessions: Array<UploadSession>;
  /** The currently authenticated user, or null if the session is missing/expired. */
  viewer: Maybe<User>;
};


export type QueryListChildrenArgs = {
  force: InputMaybe<Scalars['Boolean']['input']>;
  parentId: InputMaybe<Scalars['ID']['input']>;
  providerId: Scalars['ID']['input'];
};


export type QueryMyOperationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryOperationArgs = {
  id: Scalars['ID']['input'];
};


export type QueryProviderArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUploadSessionArgs = {
  id: Scalars['ID']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  /**
   * Live progress stream for one operation. Emits ProgressEvent / JobStatusEvent /
   * OperationStatusEvent until the operation hits a terminal state, then the
   * stream closes.
   */
  operationProgress: OperationProgress;
};


export type SubscriptionOperationProgressArgs = {
  operationId: Scalars['ID']['input'];
};

/**
 * Transfer N source nodes from their (shared) provider to a destination
 * provider + parent. `srcNodeIds` must be non-empty. Each source is expanded
 * to its subtree; all entries land in one operation with one BullMQ job per
 * entry.
 */
export type TransferPreflightInput = {
  /**  When true the worker deletes the source nodes after transfer succeeds (move semantics).  */
  deleteSource?: InputMaybe<Scalars['Boolean']['input']>;
  dstParentId?: InputMaybe<Scalars['ID']['input']>;
  dstProviderId: Scalars['ID']['input'];
  srcNodeIds: Array<Scalars['ID']['input']>;
  strategy: ConflictStrategy;
};

export type TransferStats = {
  __typename?: 'TransferStats';
  bytesDownloaded: Scalars['BigInt']['output'];
  bytesTransferred: Scalars['BigInt']['output'];
  bytesUploaded: Scalars['BigInt']['output'];
  filesDownloaded: Scalars['Int']['output'];
  filesTransferred: Scalars['Int']['output'];
  filesUploaded: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type UpdateStatus = {
  __typename?: 'UpdateStatus';
  currentVersion: Maybe<Scalars['String']['output']>;
  message: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  targetVersion: Maybe<Scalars['String']['output']>;
};

export type UploadPartInput = {
  /** ETag returned by the upstream S3 on the PUT response. Quoted or unquoted; server normalizes. */
  etag: Scalars['String']['input'];
  partNumber: Scalars['Int']['input'];
};

export type UploadPreflightInput = {
  dstParentId?: InputMaybe<Scalars['ID']['input']>;
  dstProviderId: Scalars['ID']['input'];
  strategy: ConflictStrategy;
  tree: Array<LocalTreeNodeInput>;
};

export type UploadSession = {
  __typename?: 'UploadSession';
  abandonedAfter: Maybe<Scalars['DateTime']['output']>;
  chunkSizeBytes: Scalars['Int']['output'];
  completedAt: Maybe<Scalars['DateTime']['output']>;
  createdAt: Scalars['DateTime']['output'];
  id: Scalars['ID']['output'];
  lastError: Maybe<Scalars['String']['output']>;
  mimeType: Maybe<Scalars['String']['output']>;
  mode: UploadSessionMode;
  name: Scalars['String']['output'];
  parentRemoteId: Maybe<Scalars['String']['output']>;
  planId: Maybe<Scalars['ID']['output']>;
  providerId: Scalars['ID']['output'];
  sizeBytes: Scalars['BigInt']['output'];
  status: UploadSessionStatus;
  totalChunks: Scalars['Int']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

/**
 * Upload session = the byte-plumbing layer under one file entry inside an
 * upload operation. A single upload operation may now have many sessions.
 *
 * Flow:
 *   1. `preflight(kind=upload, tree=[singleFile], strategy=...)` → Operation(ready)
 *   2. `initiateUploadSession(operationId)` → one session per upload entry
 *   3. Client ships bytes (proxy: PUT /api/upload/:sessionId/:index, direct: PUT to S3)
 *   4. `completeUploadSession(sessionId, parts?)` → session(ready)
 *   5. `executePlan(operationId)` → worker finalizes (writes Node row, etc.)
 *
 * Direct mode (S3) hands the browser short-TTL presigned URLs so bytes never
 * transit our process. Proxy mode stages chunks to disk and the worker
 * assembles them into one `provider.upload()` call.
 */
export type UploadSessionMode =
  | 'direct'
  | 'proxy';

export type UploadSessionStatus =
  | 'cancelled'
  | 'completed'
  | 'failed'
  | 'pending'
  | 'ready'
  | 'uploading';

export type Usage = {
  __typename?: 'Usage';
  available: Maybe<Scalars['BigInt']['output']>;
  lastSyncedAt: Scalars['DateTime']['output'];
  total: Maybe<Scalars['BigInt']['output']>;
  used: Maybe<Scalars['BigInt']['output']>;
};

export type User = {
  __typename?: 'User';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type ListChildrenQueryVariables = Exact<{
  providerId: Scalars['ID']['input'];
  parentId: InputMaybe<Scalars['ID']['input']>;
  force: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ListChildrenQuery = { __typename?: 'Query', listChildren: { __typename?: 'NodePage', nextPageToken: string | null, nodes: Array<{ __typename?: 'Node', id: string, providerId: string, remoteId: string, name: string, type: NodeType, parentId: string | null, pathText: string, size: string | number | null, mimeType: string | null, remoteCreatedAt: string | null, remoteUpdatedAt: string | null }> } };

export type CreateFolderMutationVariables = Exact<{
  providerId: Scalars['ID']['input'];
  parentId: InputMaybe<Scalars['ID']['input']>;
  name: Scalars['String']['input'];
}>;


export type CreateFolderMutation = { __typename?: 'Mutation', createFolder: { __typename?: 'Node', id: string, providerId: string, remoteId: string, name: string, type: NodeType, parentId: string | null, pathText: string, size: string | number | null, mimeType: string | null, remoteCreatedAt: string | null, remoteUpdatedAt: string | null } };

export type RenameNodeMutationVariables = Exact<{
  nodeId: Scalars['ID']['input'];
  newName: Scalars['String']['input'];
}>;


export type RenameNodeMutation = { __typename?: 'Mutation', renameNode: { __typename?: 'Node', id: string, providerId: string, remoteId: string, name: string, type: NodeType, parentId: string | null, pathText: string, size: string | number | null, mimeType: string | null, remoteCreatedAt: string | null, remoteUpdatedAt: string | null } };

export type GetAppMetadataQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAppMetadataQuery = { __typename?: 'Query', appMetadata: { __typename?: 'AppMetadata', version: string } };

export type GetUpdateStatusQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUpdateStatusQuery = { __typename?: 'Query', updateStatus: { __typename?: 'UpdateStatus', status: string, message: string | null, currentVersion: string | null, targetVersion: string | null } };

export type TriggerAppUpdateMutationVariables = Exact<{
  version: InputMaybe<Scalars['String']['input']>;
}>;


export type TriggerAppUpdateMutation = { __typename?: 'Mutation', triggerAppUpdate: { __typename?: 'UpdateStatus', status: string, message: string | null, currentVersion: string | null, targetVersion: string | null } };

export type OperationSummaryPartsFragment = { __typename?: 'OperationSummary', totalEntries: number, totalBytes: string | number, conflicts: number };

export type PlanEntryPartsFragment = { __typename?: 'PlanEntry', kind: string, srcPath: string | null, dstPath: string, srcName: string | null, dstName: string, size: string | number | null };

export type PreflightResultPartsFragment = { __typename?: 'PreflightResult', id: string, operationId: string, status: OperationStatus, summary: { __typename?: 'OperationSummary', totalEntries: number, totalBytes: string | number, conflicts: number }, entries: Array<{ __typename?: 'PlanEntry', kind: string, srcPath: string | null, dstPath: string, srcName: string | null, dstName: string, size: string | number | null }> };

export type OperationPartsFragment = { __typename?: 'Operation', id: string, kind: OperationKind, status: OperationStatus, error: string | null, createdAt: string, jobCounts: { __typename?: 'OperationJobCounts', total: number, queued: number, running: number, succeeded: number, failed: number, skipped: number, cancelled: number }, summary: { __typename?: 'OperationSummary', totalEntries: number, totalBytes: string | number, conflicts: number } | null, entries: Array<{ __typename?: 'PlanEntry', dstName: string, srcPath: string | null, dstPath: string, size: string | number | null }> };

export type MyOperationsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyOperationsQuery = { __typename?: 'Query', myOperations: Array<{ __typename?: 'Operation', id: string, kind: OperationKind, status: OperationStatus, error: string | null, createdAt: string, jobCounts: { __typename?: 'OperationJobCounts', total: number, queued: number, running: number, succeeded: number, failed: number, skipped: number, cancelled: number }, summary: { __typename?: 'OperationSummary', totalEntries: number, totalBytes: string | number, conflicts: number } | null, entries: Array<{ __typename?: 'PlanEntry', dstName: string, srcPath: string | null, dstPath: string, size: string | number | null }> }> };

export type PreflightMutationVariables = Exact<{
  input: PreflightInput;
}>;


export type PreflightMutation = { __typename?: 'Mutation', preflight: { __typename?: 'PreflightResult', id: string, operationId: string, status: OperationStatus, summary: { __typename?: 'OperationSummary', totalEntries: number, totalBytes: string | number, conflicts: number }, entries: Array<{ __typename?: 'PlanEntry', kind: string, srcPath: string | null, dstPath: string, srcName: string | null, dstName: string, size: string | number | null }> } };

export type ExecutePlanMutationVariables = Exact<{
  operationId: Scalars['ID']['input'];
}>;


export type ExecutePlanMutation = { __typename?: 'Mutation', executePlan: { __typename?: 'ExecuteResult', operationId: string, jobIds: Array<string> } };

export type ResolveConflictMutationVariables = Exact<{
  conflictId: Scalars['ID']['input'];
  action: ConflictAction;
  applyToAll: InputMaybe<Scalars['Boolean']['input']>;
}>;


export type ResolveConflictMutation = { __typename?: 'Mutation', resolveConflict: { __typename?: 'Operation', id: string, status: OperationStatus } };

export type CancelOperationMutationVariables = Exact<{
  operationId: Scalars['ID']['input'];
}>;


export type CancelOperationMutation = { __typename?: 'Mutation', cancelOperation: { __typename?: 'Operation', id: string, status: OperationStatus } };

export type OperationProgressSubscriptionVariables = Exact<{
  operationId: Scalars['ID']['input'];
}>;


export type OperationProgressSubscription = { __typename?: 'Subscription', operationProgress: { __typename: 'ConflictDiscoveredEvent', operationId: string, jobId: string, conflictId: string, path: string, existingType: NodeType, incomingType: NodeType } | { __typename: 'JobStatusEvent', operationId: string, jobId: string, error: string | null, jobStatus: JobStatus } | { __typename: 'OperationStatusEvent', operationId: string, lifecycleStatus: OperationLifecycleStatus } | { __typename: 'ProgressEvent', operationId: string, jobId: string, bytes: string | number, sizeBytes: string | number | null, entryKind: string } };

export type ProviderTypesQueryVariables = Exact<{ [key: string]: never; }>;


export type ProviderTypesQuery = { __typename?: 'Query', providerTypes: Array<{ __typename?: 'ProviderType', type: string, label: string, authKind: ProviderAuthKind, credentialFields: Array<{ __typename?: 'ProviderCredentialField', key: string, label: string, type: ProviderFieldType, required: boolean, placeholder: string | null, helpText: string | null }> }> };

export type MyProvidersQueryVariables = Exact<{ [key: string]: never; }>;


export type MyProvidersQuery = { __typename?: 'Query', myProviders: Array<{ __typename?: 'Provider', id: string, type: string, authKind: ProviderAuthKind, label: string, status: ProviderStatus, lastError: string | null, createdAt: string }> };

export type MyOAuthAppsQueryVariables = Exact<{ [key: string]: never; }>;


export type MyOAuthAppsQuery = { __typename?: 'Query', myOAuthApps: Array<{ __typename?: 'OAuthApp', id: string, provider: string, label: string, clientId: string, createdAt: string }> };

export type ConnectProviderMutationVariables = Exact<{
  input: ConnectProviderInput;
}>;


export type ConnectProviderMutation = { __typename?: 'Mutation', connectProvider: { __typename?: 'Provider', id: string, type: string, authKind: ProviderAuthKind, label: string, status: ProviderStatus, lastError: string | null, createdAt: string } };

export type CreateOAuthAppMutationVariables = Exact<{
  input: CreateOAuthAppInput;
}>;


export type CreateOAuthAppMutation = { __typename?: 'Mutation', createOAuthApp: { __typename?: 'OAuthApp', id: string, provider: string, label: string, clientId: string, createdAt: string } };

export type BeginProviderOAuthMutationVariables = Exact<{
  input: BeginProviderOAuthInput;
}>;


export type BeginProviderOAuthMutation = { __typename?: 'Mutation', beginProviderOAuth: { __typename?: 'BeginProviderOAuthPayload', authorizeUrl: string, state: string } };

export type UploadSessionPartsFragment = { __typename?: 'UploadSession', id: string, providerId: string, parentRemoteId: string | null, name: string, sizeBytes: string | number, mimeType: string | null, mode: UploadSessionMode, chunkSizeBytes: number, totalChunks: number, status: UploadSessionStatus, planId: string | null, lastError: string | null, createdAt: string, updatedAt: string, completedAt: string | null };

export type InitiateUploadSessionMutationVariables = Exact<{
  input: InitiateUploadSessionInput;
}>;


export type InitiateUploadSessionMutation = { __typename?: 'Mutation', initiateUploadSession: { __typename?: 'InitiateUploadSessionPayload', sessions: Array<{ __typename?: 'InitiatedUploadSession', chunkUploadUrlPattern: string | null, session: { __typename?: 'UploadSession', id: string, providerId: string, parentRemoteId: string | null, name: string, sizeBytes: string | number, mimeType: string | null, mode: UploadSessionMode, chunkSizeBytes: number, totalChunks: number, status: UploadSessionStatus, planId: string | null, lastError: string | null, createdAt: string, updatedAt: string, completedAt: string | null }, presignedParts: Array<{ __typename?: 'PresignedPart', partNumber: number, url: string }> | null }> } };

export type CompleteUploadSessionMutationVariables = Exact<{
  input: CompleteUploadSessionInput;
}>;


export type CompleteUploadSessionMutation = { __typename?: 'Mutation', completeUploadSession: { __typename?: 'UploadSession', id: string, providerId: string, parentRemoteId: string | null, name: string, sizeBytes: string | number, mimeType: string | null, mode: UploadSessionMode, chunkSizeBytes: number, totalChunks: number, status: UploadSessionStatus, planId: string | null, lastError: string | null, createdAt: string, updatedAt: string, completedAt: string | null } };

export type CancelUploadSessionMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type CancelUploadSessionMutation = { __typename?: 'Mutation', cancelUploadSession: { __typename?: 'UploadSession', id: string, providerId: string, parentRemoteId: string | null, name: string, sizeBytes: string | number, mimeType: string | null, mode: UploadSessionMode, chunkSizeBytes: number, totalChunks: number, status: UploadSessionStatus, planId: string | null, lastError: string | null, createdAt: string, updatedAt: string, completedAt: string | null } };

export type ViewerQueryVariables = Exact<{ [key: string]: never; }>;


export type ViewerQuery = { __typename?: 'Query', viewer: { __typename?: 'User', id: string, email: string, name: string } | null };

export const OperationSummaryPartsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OperationSummaryParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OperationSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalEntries"}},{"kind":"Field","name":{"kind":"Name","value":"totalBytes"}},{"kind":"Field","name":{"kind":"Name","value":"conflicts"}}]}}]} as unknown as DocumentNode<OperationSummaryPartsFragment, unknown>;
export const PlanEntryPartsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PlanEntryParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PlanEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"srcPath"}},{"kind":"Field","name":{"kind":"Name","value":"dstPath"}},{"kind":"Field","name":{"kind":"Name","value":"srcName"}},{"kind":"Field","name":{"kind":"Name","value":"dstName"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}}]} as unknown as DocumentNode<PlanEntryPartsFragment, unknown>;
export const PreflightResultPartsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreflightResultParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PreflightResult"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"operationId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"summary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OperationSummaryParts"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PlanEntryParts"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OperationSummaryParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OperationSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalEntries"}},{"kind":"Field","name":{"kind":"Name","value":"totalBytes"}},{"kind":"Field","name":{"kind":"Name","value":"conflicts"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PlanEntryParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PlanEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"srcPath"}},{"kind":"Field","name":{"kind":"Name","value":"dstPath"}},{"kind":"Field","name":{"kind":"Name","value":"srcName"}},{"kind":"Field","name":{"kind":"Name","value":"dstName"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}}]} as unknown as DocumentNode<PreflightResultPartsFragment, unknown>;
export const OperationPartsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OperationParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Operation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"jobCounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"queued"}},{"kind":"Field","name":{"kind":"Name","value":"running"}},{"kind":"Field","name":{"kind":"Name","value":"succeeded"}},{"kind":"Field","name":{"kind":"Name","value":"failed"}},{"kind":"Field","name":{"kind":"Name","value":"skipped"}},{"kind":"Field","name":{"kind":"Name","value":"cancelled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"summary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OperationSummaryParts"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dstName"}},{"kind":"Field","name":{"kind":"Name","value":"srcPath"}},{"kind":"Field","name":{"kind":"Name","value":"dstPath"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OperationSummaryParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OperationSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalEntries"}},{"kind":"Field","name":{"kind":"Name","value":"totalBytes"}},{"kind":"Field","name":{"kind":"Name","value":"conflicts"}}]}}]} as unknown as DocumentNode<OperationPartsFragment, unknown>;
export const UploadSessionPartsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UploadSessionParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UploadSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"parentRemoteId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"chunkSizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"totalChunks"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"planId"}},{"kind":"Field","name":{"kind":"Name","value":"lastError"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}}]} as unknown as DocumentNode<UploadSessionPartsFragment, unknown>;
export const ListChildrenDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListChildren"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"providerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"force"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listChildren"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"providerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"providerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"parentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"force"},"value":{"kind":"Variable","name":{"kind":"Name","value":"force"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"nextPageToken"}},{"kind":"Field","name":{"kind":"Name","value":"nodes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"remoteId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}},{"kind":"Field","name":{"kind":"Name","value":"pathText"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"remoteCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"remoteUpdatedAt"}}]}}]}}]}}]} as unknown as DocumentNode<ListChildrenQuery, ListChildrenQueryVariables>;
export const CreateFolderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateFolder"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"providerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"name"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createFolder"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"providerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"providerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"parentId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"parentId"}}},{"kind":"Argument","name":{"kind":"Name","value":"name"},"value":{"kind":"Variable","name":{"kind":"Name","value":"name"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"remoteId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}},{"kind":"Field","name":{"kind":"Name","value":"pathText"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"remoteCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"remoteUpdatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateFolderMutation, CreateFolderMutationVariables>;
export const RenameNodeDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RenameNode"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"nodeId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"newName"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"renameNode"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"nodeId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"nodeId"}}},{"kind":"Argument","name":{"kind":"Name","value":"newName"},"value":{"kind":"Variable","name":{"kind":"Name","value":"newName"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"remoteId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"parentId"}},{"kind":"Field","name":{"kind":"Name","value":"pathText"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"remoteCreatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"remoteUpdatedAt"}}]}}]}}]} as unknown as DocumentNode<RenameNodeMutation, RenameNodeMutationVariables>;
export const GetAppMetadataDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAppMetadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"appMetadata"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"version"}}]}}]}}]} as unknown as DocumentNode<GetAppMetadataQuery, GetAppMetadataQueryVariables>;
export const GetUpdateStatusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUpdateStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateStatus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"currentVersion"}},{"kind":"Field","name":{"kind":"Name","value":"targetVersion"}}]}}]}}]} as unknown as DocumentNode<GetUpdateStatusQuery, GetUpdateStatusQueryVariables>;
export const TriggerAppUpdateDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"TriggerAppUpdate"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"version"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"triggerAppUpdate"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"version"},"value":{"kind":"Variable","name":{"kind":"Name","value":"version"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"message"}},{"kind":"Field","name":{"kind":"Name","value":"currentVersion"}},{"kind":"Field","name":{"kind":"Name","value":"targetVersion"}}]}}]}}]} as unknown as DocumentNode<TriggerAppUpdateMutation, TriggerAppUpdateMutationVariables>;
export const MyOperationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyOperations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myOperations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OperationParts"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OperationSummaryParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OperationSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalEntries"}},{"kind":"Field","name":{"kind":"Name","value":"totalBytes"}},{"kind":"Field","name":{"kind":"Name","value":"conflicts"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OperationParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Operation"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"jobCounts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"queued"}},{"kind":"Field","name":{"kind":"Name","value":"running"}},{"kind":"Field","name":{"kind":"Name","value":"succeeded"}},{"kind":"Field","name":{"kind":"Name","value":"failed"}},{"kind":"Field","name":{"kind":"Name","value":"skipped"}},{"kind":"Field","name":{"kind":"Name","value":"cancelled"}}]}},{"kind":"Field","name":{"kind":"Name","value":"summary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OperationSummaryParts"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"dstName"}},{"kind":"Field","name":{"kind":"Name","value":"srcPath"}},{"kind":"Field","name":{"kind":"Name","value":"dstPath"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}},{"kind":"Field","name":{"kind":"Name","value":"error"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]} as unknown as DocumentNode<MyOperationsQuery, MyOperationsQueryVariables>;
export const PreflightDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Preflight"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"PreflightInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"preflight"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PreflightResultParts"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"OperationSummaryParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OperationSummary"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalEntries"}},{"kind":"Field","name":{"kind":"Name","value":"totalBytes"}},{"kind":"Field","name":{"kind":"Name","value":"conflicts"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PlanEntryParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PlanEntry"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"srcPath"}},{"kind":"Field","name":{"kind":"Name","value":"dstPath"}},{"kind":"Field","name":{"kind":"Name","value":"srcName"}},{"kind":"Field","name":{"kind":"Name","value":"dstName"}},{"kind":"Field","name":{"kind":"Name","value":"size"}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"PreflightResultParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"PreflightResult"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"operationId"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"summary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"OperationSummaryParts"}}]}},{"kind":"Field","name":{"kind":"Name","value":"entries"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"PlanEntryParts"}}]}}]}}]} as unknown as DocumentNode<PreflightMutation, PreflightMutationVariables>;
export const ExecutePlanDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ExecutePlan"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"operationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"executePlan"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"operationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"operationId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationId"}},{"kind":"Field","name":{"kind":"Name","value":"jobIds"}}]}}]}}]} as unknown as DocumentNode<ExecutePlanMutation, ExecutePlanMutationVariables>;
export const ResolveConflictDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ResolveConflict"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"conflictId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"action"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ConflictAction"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"applyToAll"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Boolean"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"resolveConflict"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"conflictId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"conflictId"}}},{"kind":"Argument","name":{"kind":"Name","value":"action"},"value":{"kind":"Variable","name":{"kind":"Name","value":"action"}}},{"kind":"Argument","name":{"kind":"Name","value":"applyToAll"},"value":{"kind":"Variable","name":{"kind":"Name","value":"applyToAll"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<ResolveConflictMutation, ResolveConflictMutationVariables>;
export const CancelOperationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelOperation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"operationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelOperation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"operationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"operationId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}}]}}]}}]} as unknown as DocumentNode<CancelOperationMutation, CancelOperationMutationVariables>;
export const OperationProgressDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"subscription","name":{"kind":"Name","value":"OperationProgress"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"operationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationProgress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"operationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"operationId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename"}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ProgressEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationId"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"bytes"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"entryKind"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"JobStatusEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationId"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","alias":{"kind":"Name","value":"jobStatus"},"name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"OperationStatusEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationId"}},{"kind":"Field","alias":{"kind":"Name","value":"lifecycleStatus"},"name":{"kind":"Name","value":"status"}}]}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"ConflictDiscoveredEvent"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"operationId"}},{"kind":"Field","name":{"kind":"Name","value":"jobId"}},{"kind":"Field","name":{"kind":"Name","value":"conflictId"}},{"kind":"Field","name":{"kind":"Name","value":"path"}},{"kind":"Field","name":{"kind":"Name","value":"existingType"}},{"kind":"Field","name":{"kind":"Name","value":"incomingType"}}]}}]}}]}}]} as unknown as DocumentNode<OperationProgressSubscription, OperationProgressSubscriptionVariables>;
export const ProviderTypesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProviderTypes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"providerTypes"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"authKind"}},{"kind":"Field","name":{"kind":"Name","value":"credentialFields"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"required"}},{"kind":"Field","name":{"kind":"Name","value":"placeholder"}},{"kind":"Field","name":{"kind":"Name","value":"helpText"}}]}}]}}]}}]} as unknown as DocumentNode<ProviderTypesQuery, ProviderTypesQueryVariables>;
export const MyProvidersDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myProviders"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"authKind"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"lastError"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<MyProvidersQuery, MyProvidersQueryVariables>;
export const MyOAuthAppsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MyOAuthApps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"myOAuthApps"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<MyOAuthAppsQuery, MyOAuthAppsQueryVariables>;
export const ConnectProviderDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ConnectProvider"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ConnectProviderInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"connectProvider"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"authKind"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"lastError"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<ConnectProviderMutation, ConnectProviderMutationVariables>;
export const CreateOAuthAppDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateOAuthApp"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateOAuthAppInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createOAuthApp"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"provider"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"clientId"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<CreateOAuthAppMutation, CreateOAuthAppMutationVariables>;
export const BeginProviderOAuthDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"BeginProviderOAuth"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"BeginProviderOAuthInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"beginProviderOAuth"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"authorizeUrl"}},{"kind":"Field","name":{"kind":"Name","value":"state"}}]}}]}}]} as unknown as DocumentNode<BeginProviderOAuthMutation, BeginProviderOAuthMutationVariables>;
export const InitiateUploadSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"InitiateUploadSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InitiateUploadSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"initiateUploadSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"session"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UploadSessionParts"}}]}},{"kind":"Field","name":{"kind":"Name","value":"chunkUploadUrlPattern"}},{"kind":"Field","name":{"kind":"Name","value":"presignedParts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"partNumber"}},{"kind":"Field","name":{"kind":"Name","value":"url"}}]}}]}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UploadSessionParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UploadSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"parentRemoteId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"chunkSizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"totalChunks"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"planId"}},{"kind":"Field","name":{"kind":"Name","value":"lastError"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}}]} as unknown as DocumentNode<InitiateUploadSessionMutation, InitiateUploadSessionMutationVariables>;
export const CompleteUploadSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CompleteUploadSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CompleteUploadSessionInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"completeUploadSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UploadSessionParts"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UploadSessionParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UploadSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"parentRemoteId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"chunkSizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"totalChunks"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"planId"}},{"kind":"Field","name":{"kind":"Name","value":"lastError"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}}]} as unknown as DocumentNode<CompleteUploadSessionMutation, CompleteUploadSessionMutationVariables>;
export const CancelUploadSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CancelUploadSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"cancelUploadSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"UploadSessionParts"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"UploadSessionParts"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"UploadSession"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"providerId"}},{"kind":"Field","name":{"kind":"Name","value":"parentRemoteId"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"sizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"mode"}},{"kind":"Field","name":{"kind":"Name","value":"chunkSizeBytes"}},{"kind":"Field","name":{"kind":"Name","value":"totalChunks"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"planId"}},{"kind":"Field","name":{"kind":"Name","value":"lastError"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"completedAt"}}]}}]} as unknown as DocumentNode<CancelUploadSessionMutation, CancelUploadSessionMutationVariables>;
export const ViewerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Viewer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"viewer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<ViewerQuery, ViewerQueryVariables>;