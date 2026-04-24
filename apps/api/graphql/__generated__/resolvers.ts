import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import type { ProviderMapper, NodeMapper, UsageMapper, OAuthAppMapper, UserMapper, OperationMapper, UploadSessionMapper, PlanEntryMapper, ProgressEventMapper, JobStatusEventMapper, OperationStatusEventMapper, ConflictDiscoveredEventMapper } from '~/graphql/mappers';
import type { GraphQLContext } from '~/graphql/context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  BigInt: { input: bigint | number; output: bigint | number; }
  DateTime: { input: Date; output: Date; }
  JSON: { input: unknown; output: unknown; }
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
  parentId?: InputMaybe<Scalars['ID']['input']>;
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
  applyToAll?: InputMaybe<Scalars['Boolean']['input']>;
  conflictId: Scalars['ID']['input'];
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
  /** Single upload session by id, scoped to the viewer. */
  uploadSession: Maybe<UploadSession>;
  /** Non-terminal upload sessions for the viewer (pending / uploading / ready). */
  uploadSessions: Array<UploadSession>;
  /** The currently authenticated user, or null if the session is missing/expired. */
  viewer: Maybe<User>;
};


export type QueryListChildrenArgs = {
  force?: InputMaybe<Scalars['Boolean']['input']>;
  parentId?: InputMaybe<Scalars['ID']['input']>;
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

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping of union types */
export type ResolversUnionTypes<_RefType extends Record<string, unknown>> = ResolversObject<{
  OperationProgress:
    | ( ConflictDiscoveredEventMapper )
    | ( JobStatusEventMapper )
    | ( OperationStatusEventMapper )
    | ( ProgressEventMapper )
  ;
}>;


/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  BeginProviderOAuthInput: BeginProviderOAuthInput;
  BeginProviderOAuthPayload: ResolverTypeWrapper<BeginProviderOAuthPayload>;
  BigInt: ResolverTypeWrapper<Scalars['BigInt']['output']>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CompleteProviderOAuthInput: CompleteProviderOAuthInput;
  CompleteUploadSessionInput: CompleteUploadSessionInput;
  ConflictAction: ConflictAction;
  ConflictDiscoveredEvent: ResolverTypeWrapper<ConflictDiscoveredEventMapper>;
  ConflictStrategy: ConflictStrategy;
  ConnectProviderInput: ConnectProviderInput;
  CopyTreePreflightInput: CopyTreePreflightInput;
  CreateOAuthAppInput: CreateOAuthAppInput;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DeleteTreePreflightInput: DeleteTreePreflightInput;
  ExecuteResult: ResolverTypeWrapper<ExecuteResult>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  InitiateUploadSessionInput: InitiateUploadSessionInput;
  InitiateUploadSessionPayload: ResolverTypeWrapper<Omit<InitiateUploadSessionPayload, 'sessions'> & { sessions: Array<ResolversTypes['InitiatedUploadSession']> }>;
  InitiatedUploadSession: ResolverTypeWrapper<Omit<InitiatedUploadSession, 'session'> & { session: ResolversTypes['UploadSession'] }>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  JobStatus: JobStatus;
  JobStatusEvent: ResolverTypeWrapper<JobStatusEventMapper>;
  LocalTreeNodeInput: LocalTreeNodeInput;
  MoveTreePreflightInput: MoveTreePreflightInput;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Node: ResolverTypeWrapper<NodeMapper>;
  NodePage: ResolverTypeWrapper<Omit<NodePage, 'nodes'> & { nodes: Array<ResolversTypes['Node']> }>;
  NodeType: NodeType;
  OAuthApp: ResolverTypeWrapper<OAuthAppMapper>;
  Operation: ResolverTypeWrapper<OperationMapper>;
  OperationJobCounts: ResolverTypeWrapper<OperationJobCounts>;
  OperationKind: OperationKind;
  OperationLifecycleStatus: OperationLifecycleStatus;
  OperationProgress: ResolverTypeWrapper<ResolversUnionTypes<ResolversTypes>['OperationProgress']>;
  OperationStatus: OperationStatus;
  OperationStatusEvent: ResolverTypeWrapper<OperationStatusEventMapper>;
  OperationSummary: ResolverTypeWrapper<OperationSummary>;
  PlanEntry: ResolverTypeWrapper<PlanEntryMapper>;
  PreflightInput: PreflightInput;
  PreflightResult: ResolverTypeWrapper<Omit<PreflightResult, 'entries'> & { entries: Array<ResolversTypes['PlanEntry']> }>;
  PresignedPart: ResolverTypeWrapper<PresignedPart>;
  ProgressEvent: ResolverTypeWrapper<ProgressEventMapper>;
  Provider: ResolverTypeWrapper<ProviderMapper>;
  ProviderAuthKind: ProviderAuthKind;
  ProviderCapabilities: ResolverTypeWrapper<ProviderCapabilities>;
  ProviderCredentialField: ResolverTypeWrapper<ProviderCredentialField>;
  ProviderFieldType: ProviderFieldType;
  ProviderStatus: ProviderStatus;
  ProviderType: ResolverTypeWrapper<ProviderType>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<Record<PropertyKey, never>>;
  TransferPreflightInput: TransferPreflightInput;
  UploadPartInput: UploadPartInput;
  UploadPreflightInput: UploadPreflightInput;
  UploadSession: ResolverTypeWrapper<UploadSessionMapper>;
  UploadSessionMode: UploadSessionMode;
  UploadSessionStatus: UploadSessionStatus;
  Usage: ResolverTypeWrapper<UsageMapper>;
  User: ResolverTypeWrapper<UserMapper>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  BeginProviderOAuthInput: BeginProviderOAuthInput;
  BeginProviderOAuthPayload: BeginProviderOAuthPayload;
  BigInt: Scalars['BigInt']['output'];
  Boolean: Scalars['Boolean']['output'];
  CompleteProviderOAuthInput: CompleteProviderOAuthInput;
  CompleteUploadSessionInput: CompleteUploadSessionInput;
  ConflictDiscoveredEvent: ConflictDiscoveredEventMapper;
  ConnectProviderInput: ConnectProviderInput;
  CopyTreePreflightInput: CopyTreePreflightInput;
  CreateOAuthAppInput: CreateOAuthAppInput;
  DateTime: Scalars['DateTime']['output'];
  DeleteTreePreflightInput: DeleteTreePreflightInput;
  ExecuteResult: ExecuteResult;
  ID: Scalars['ID']['output'];
  InitiateUploadSessionInput: InitiateUploadSessionInput;
  InitiateUploadSessionPayload: Omit<InitiateUploadSessionPayload, 'sessions'> & { sessions: Array<ResolversParentTypes['InitiatedUploadSession']> };
  InitiatedUploadSession: Omit<InitiatedUploadSession, 'session'> & { session: ResolversParentTypes['UploadSession'] };
  Int: Scalars['Int']['output'];
  JSON: Scalars['JSON']['output'];
  JobStatusEvent: JobStatusEventMapper;
  LocalTreeNodeInput: LocalTreeNodeInput;
  MoveTreePreflightInput: MoveTreePreflightInput;
  Mutation: Record<PropertyKey, never>;
  Node: NodeMapper;
  NodePage: Omit<NodePage, 'nodes'> & { nodes: Array<ResolversParentTypes['Node']> };
  OAuthApp: OAuthAppMapper;
  Operation: OperationMapper;
  OperationJobCounts: OperationJobCounts;
  OperationProgress: ResolversUnionTypes<ResolversParentTypes>['OperationProgress'];
  OperationStatusEvent: OperationStatusEventMapper;
  OperationSummary: OperationSummary;
  PlanEntry: PlanEntryMapper;
  PreflightInput: PreflightInput;
  PreflightResult: Omit<PreflightResult, 'entries'> & { entries: Array<ResolversParentTypes['PlanEntry']> };
  PresignedPart: PresignedPart;
  ProgressEvent: ProgressEventMapper;
  Provider: ProviderMapper;
  ProviderCapabilities: ProviderCapabilities;
  ProviderCredentialField: ProviderCredentialField;
  ProviderType: ProviderType;
  Query: Record<PropertyKey, never>;
  String: Scalars['String']['output'];
  Subscription: Record<PropertyKey, never>;
  TransferPreflightInput: TransferPreflightInput;
  UploadPartInput: UploadPartInput;
  UploadPreflightInput: UploadPreflightInput;
  UploadSession: UploadSessionMapper;
  Usage: UsageMapper;
  User: UserMapper;
}>;

export type BeginProviderOAuthPayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['BeginProviderOAuthPayload'] = ResolversParentTypes['BeginProviderOAuthPayload']> = ResolversObject<{
  authorizeUrl?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  state?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export interface BigIntScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['BigInt'], any> {
  name: 'BigInt';
}

export type ConflictDiscoveredEventResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ConflictDiscoveredEvent'] = ResolversParentTypes['ConflictDiscoveredEvent']> = ResolversObject<{
  conflictId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  existingType?: Resolver<ResolversTypes['NodeType'], ParentType, ContextType>;
  incomingType?: Resolver<ResolversTypes['NodeType'], ParentType, ContextType>;
  jobId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  operationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  path?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type ExecuteResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ExecuteResult'] = ResolversParentTypes['ExecuteResult']> = ResolversObject<{
  jobIds?: Resolver<Array<ResolversTypes['ID']>, ParentType, ContextType>;
  operationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
}>;

export type InitiateUploadSessionPayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['InitiateUploadSessionPayload'] = ResolversParentTypes['InitiateUploadSessionPayload']> = ResolversObject<{
  sessions?: Resolver<Array<ResolversTypes['InitiatedUploadSession']>, ParentType, ContextType>;
}>;

export type InitiatedUploadSessionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['InitiatedUploadSession'] = ResolversParentTypes['InitiatedUploadSession']> = ResolversObject<{
  chunkUploadUrlPattern?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  presignedParts?: Resolver<Maybe<Array<ResolversTypes['PresignedPart']>>, ParentType, ContextType>;
  session?: Resolver<ResolversTypes['UploadSession'], ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type JobStatusEventResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['JobStatusEvent'] = ResolversParentTypes['JobStatusEvent']> = ResolversObject<{
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  jobId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  operationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['JobStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  beginProviderOAuth?: Resolver<ResolversTypes['BeginProviderOAuthPayload'], ParentType, ContextType, RequireFields<MutationBeginProviderOAuthArgs, 'input'>>;
  cancelOperation?: Resolver<ResolversTypes['Operation'], ParentType, ContextType, RequireFields<MutationCancelOperationArgs, 'operationId'>>;
  cancelUploadSession?: Resolver<ResolversTypes['UploadSession'], ParentType, ContextType, RequireFields<MutationCancelUploadSessionArgs, 'id'>>;
  completeProviderOAuth?: Resolver<ResolversTypes['Provider'], ParentType, ContextType, RequireFields<MutationCompleteProviderOAuthArgs, 'input'>>;
  completeUploadSession?: Resolver<ResolversTypes['UploadSession'], ParentType, ContextType, RequireFields<MutationCompleteUploadSessionArgs, 'input'>>;
  connectProvider?: Resolver<ResolversTypes['Provider'], ParentType, ContextType, RequireFields<MutationConnectProviderArgs, 'input'>>;
  createFolder?: Resolver<ResolversTypes['Node'], ParentType, ContextType, RequireFields<MutationCreateFolderArgs, 'name' | 'providerId'>>;
  createOAuthApp?: Resolver<ResolversTypes['OAuthApp'], ParentType, ContextType, RequireFields<MutationCreateOAuthAppArgs, 'input'>>;
  deleteOAuthApp?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteOAuthAppArgs, 'id'>>;
  disconnectProvider?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDisconnectProviderArgs, 'id'>>;
  executePlan?: Resolver<ResolversTypes['ExecuteResult'], ParentType, ContextType, RequireFields<MutationExecutePlanArgs, 'operationId'>>;
  initiateUploadSession?: Resolver<ResolversTypes['InitiateUploadSessionPayload'], ParentType, ContextType, RequireFields<MutationInitiateUploadSessionArgs, 'input'>>;
  preflight?: Resolver<ResolversTypes['PreflightResult'], ParentType, ContextType, RequireFields<MutationPreflightArgs, 'input'>>;
  refreshUsage?: Resolver<ResolversTypes['Usage'], ParentType, ContextType, RequireFields<MutationRefreshUsageArgs, 'id'>>;
  renameNode?: Resolver<ResolversTypes['Node'], ParentType, ContextType, RequireFields<MutationRenameNodeArgs, 'newName' | 'nodeId'>>;
  resolveConflict?: Resolver<ResolversTypes['Operation'], ParentType, ContextType, RequireFields<MutationResolveConflictArgs, 'action' | 'conflictId'>>;
}>;

export type NodeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Node'] = ResolversParentTypes['Node']> = ResolversObject<{
  checksum?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  mimeType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parentId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  pathText?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  providerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  remoteCreatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  remoteId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  remoteUpdatedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  size?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  syncedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['NodeType'], ParentType, ContextType>;
}>;

export type NodePageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['NodePage'] = ResolversParentTypes['NodePage']> = ResolversObject<{
  nextPageToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['Node']>, ParentType, ContextType>;
}>;

export type OAuthAppResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OAuthApp'] = ResolversParentTypes['OAuthApp']> = ResolversObject<{
  clientId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  provider?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type OperationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Operation'] = ResolversParentTypes['Operation']> = ResolversObject<{
  completedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  entries?: Resolver<Array<ResolversTypes['PlanEntry']>, ParentType, ContextType>;
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  jobCounts?: Resolver<ResolversTypes['OperationJobCounts'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['OperationKind'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['OperationStatus'], ParentType, ContextType>;
  strategy?: Resolver<ResolversTypes['ConflictStrategy'], ParentType, ContextType>;
  summary?: Resolver<Maybe<ResolversTypes['OperationSummary']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type OperationJobCountsResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OperationJobCounts'] = ResolversParentTypes['OperationJobCounts']> = ResolversObject<{
  cancelled?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  failed?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  queued?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  running?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  skipped?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  succeeded?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  total?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type OperationProgressResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OperationProgress'] = ResolversParentTypes['OperationProgress']> = ResolversObject<{
  __resolveType: TypeResolveFn<'ConflictDiscoveredEvent' | 'JobStatusEvent' | 'OperationStatusEvent' | 'ProgressEvent', ParentType, ContextType>;
}>;

export type OperationStatusEventResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OperationStatusEvent'] = ResolversParentTypes['OperationStatusEvent']> = ResolversObject<{
  operationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['OperationLifecycleStatus'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type OperationSummaryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['OperationSummary'] = ResolversParentTypes['OperationSummary']> = ResolversObject<{
  conflicts?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalBytes?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  totalEntries?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
}>;

export type PlanEntryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PlanEntry'] = ResolversParentTypes['PlanEntry']> = ResolversObject<{
  dstName?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  dstPath?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  kind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  size?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  srcName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  srcPath?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type PreflightResultResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PreflightResult'] = ResolversParentTypes['PreflightResult']> = ResolversObject<{
  entries?: Resolver<Array<ResolversTypes['PlanEntry']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  operationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['OperationStatus'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['OperationSummary'], ParentType, ContextType>;
}>;

export type PresignedPartResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PresignedPart'] = ResolversParentTypes['PresignedPart']> = ResolversObject<{
  partNumber?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type ProgressEventResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProgressEvent'] = ResolversParentTypes['ProgressEvent']> = ResolversObject<{
  bytes?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  entryKind?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  jobId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  operationId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sizeBytes?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ProviderResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Provider'] = ResolversParentTypes['Provider']> = ResolversObject<{
  authKind?: Resolver<ResolversTypes['ProviderAuthKind'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastError?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  oauthAppId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['ProviderStatus'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  usage?: Resolver<Maybe<ResolversTypes['Usage']>, ParentType, ContextType>;
}>;

export type ProviderCapabilitiesResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProviderCapabilities'] = ResolversParentTypes['ProviderCapabilities']> = ResolversObject<{
  isHierarchical?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  supportsChecksum?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  supportsDelta?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  supportsMultipartUpload?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  supportsNativeCopy?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  supportsNativeMove?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  supportsPresignedUploadParts?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
}>;

export type ProviderCredentialFieldResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProviderCredentialField'] = ResolversParentTypes['ProviderCredentialField']> = ResolversObject<{
  helpText?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  key?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  placeholder?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  required?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['ProviderFieldType'], ParentType, ContextType>;
}>;

export type ProviderTypeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ProviderType'] = ResolversParentTypes['ProviderType']> = ResolversObject<{
  authKind?: Resolver<ResolversTypes['ProviderAuthKind'], ParentType, ContextType>;
  capabilities?: Resolver<ResolversTypes['ProviderCapabilities'], ParentType, ContextType>;
  credentialFields?: Resolver<Array<ResolversTypes['ProviderCredentialField']>, ParentType, ContextType>;
  label?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  listChildren?: Resolver<ResolversTypes['NodePage'], ParentType, ContextType, RequireFields<QueryListChildrenArgs, 'providerId'>>;
  myOAuthApps?: Resolver<Array<ResolversTypes['OAuthApp']>, ParentType, ContextType>;
  myOperations?: Resolver<Array<ResolversTypes['Operation']>, ParentType, ContextType, RequireFields<QueryMyOperationsArgs, 'limit'>>;
  myProviders?: Resolver<Array<ResolversTypes['Provider']>, ParentType, ContextType>;
  operation?: Resolver<Maybe<ResolversTypes['Operation']>, ParentType, ContextType, RequireFields<QueryOperationArgs, 'id'>>;
  provider?: Resolver<Maybe<ResolversTypes['Provider']>, ParentType, ContextType, RequireFields<QueryProviderArgs, 'id'>>;
  providerTypes?: Resolver<Array<ResolversTypes['ProviderType']>, ParentType, ContextType>;
  uploadSession?: Resolver<Maybe<ResolversTypes['UploadSession']>, ParentType, ContextType, RequireFields<QueryUploadSessionArgs, 'id'>>;
  uploadSessions?: Resolver<Array<ResolversTypes['UploadSession']>, ParentType, ContextType>;
  viewer?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
}>;

export type SubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  operationProgress?: SubscriptionResolver<ResolversTypes['OperationProgress'], "operationProgress", ParentType, ContextType, RequireFields<SubscriptionOperationProgressArgs, 'operationId'>>;
}>;

export type UploadSessionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UploadSession'] = ResolversParentTypes['UploadSession']> = ResolversObject<{
  abandonedAfter?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  chunkSizeBytes?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  completedAt?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastError?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  mimeType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  mode?: Resolver<ResolversTypes['UploadSessionMode'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parentRemoteId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  planId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  providerId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sizeBytes?: Resolver<ResolversTypes['BigInt'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['UploadSessionStatus'], ParentType, ContextType>;
  totalChunks?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
}>;

export type UsageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Usage'] = ResolversParentTypes['Usage']> = ResolversObject<{
  available?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  lastSyncedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  total?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
  used?: Resolver<Maybe<ResolversTypes['BigInt']>, ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  BeginProviderOAuthPayload?: BeginProviderOAuthPayloadResolvers<ContextType>;
  BigInt?: GraphQLScalarType;
  ConflictDiscoveredEvent?: ConflictDiscoveredEventResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  ExecuteResult?: ExecuteResultResolvers<ContextType>;
  InitiateUploadSessionPayload?: InitiateUploadSessionPayloadResolvers<ContextType>;
  InitiatedUploadSession?: InitiatedUploadSessionResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  JobStatusEvent?: JobStatusEventResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Node?: NodeResolvers<ContextType>;
  NodePage?: NodePageResolvers<ContextType>;
  OAuthApp?: OAuthAppResolvers<ContextType>;
  Operation?: OperationResolvers<ContextType>;
  OperationJobCounts?: OperationJobCountsResolvers<ContextType>;
  OperationProgress?: OperationProgressResolvers<ContextType>;
  OperationStatusEvent?: OperationStatusEventResolvers<ContextType>;
  OperationSummary?: OperationSummaryResolvers<ContextType>;
  PlanEntry?: PlanEntryResolvers<ContextType>;
  PreflightResult?: PreflightResultResolvers<ContextType>;
  PresignedPart?: PresignedPartResolvers<ContextType>;
  ProgressEvent?: ProgressEventResolvers<ContextType>;
  Provider?: ProviderResolvers<ContextType>;
  ProviderCapabilities?: ProviderCapabilitiesResolvers<ContextType>;
  ProviderCredentialField?: ProviderCredentialFieldResolvers<ContextType>;
  ProviderType?: ProviderTypeResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  UploadSession?: UploadSessionResolvers<ContextType>;
  Usage?: UsageResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
}>;

