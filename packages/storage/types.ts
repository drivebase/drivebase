/** File vs folder. Mirrors `nodes.type` in the DB. */
export type NodeType = "file" | "folder";

/** A node as returned by a provider (remote data, pre-DB). */
export type RemoteNode = {
  remoteId: string;
  name: string;
  type: NodeType;
  /** Parent's remote id. `null` means the provider root. */
  parentRemoteId: string | null;
  size?: number;
  mimeType?: string;
  checksum?: string;
  remoteCreatedAt?: Date;
  remoteUpdatedAt?: Date;
};

/** Per-provider capability flags used by the orchestrator. */
export type ProviderCapabilities = {
  isHierarchical: boolean;
  supportsNativeCopy: boolean;
  supportsNativeMove: boolean;
  supportsDelta: boolean;
  supportsChecksum: boolean;
  /**
   * Provider exposes a native multipart upload flow —
   * `initiateMultipart`, `uploadPart`, `completeMultipart`, `abortMultipart`
   * on `IStorageProvider` are non-null. Gates the worker's ability to
   * finalize a direct-mode upload without streaming bytes through us.
   */
  supportsMultipartUpload: boolean;
  /**
   * Provider can hand the browser short-TTL URLs to PUT parts directly
   * (S3-compatible only). Gates direct-mode uploads. Implies
   * `supportsMultipartUpload`.
   */
  supportsPresignedUploadParts: boolean;
};

export type UsageSnapshot = {
  total?: number;
  used?: number;
  available?: number;
};

export type ChangeEvent =
  | { kind: "upsert"; node: RemoteNode }
  | { kind: "delete"; remoteId: string };

/** Conflict strategies. Orchestrator decides how each applies; providers never see these. */
export type ConflictStrategy =
  | "overwrite"
  | "skip"
  | "rename"
  | "error"
  | "ask";

/** Discrete units of work emitted by the orchestrator into BullMQ. */
export type PlanEntryKind =
  | "createFolder"
  | "upload"
  | "copy"
  | "move"
  | "delete"
  | "transfer";

/** A reference to a file/folder on one side of an operation. */
export type RefLocator = {
  providerId: string;
  /** remoteId for existing nodes; for new-upload destinations, omit and use `parentRemoteId` + `name`. */
  remoteId?: string;
  parentRemoteId?: string | null;
  /** Materialized destination path (provider-scoped, normalized). */
  path: string;
  name: string;
};

export type PlanEntry = {
  kind: PlanEntryKind;
  src?: RefLocator;
  dst: RefLocator;
  size?: number;
};

export type ConflictAction = "overwrite" | "rename" | "skip";

export type Conflict = {
  id: string;
  /** Index into the pre-resolution plan entries array. */
  entryIndex: number;
  path: string;
  existingType: NodeType;
  incomingType: NodeType;
};

export type PreflightPlan = {
  id: string;
  operationId: string;
  entries: PlanEntry[];
  status: "ready";
  summary: { totalEntries: number; totalBytes: number; conflicts: number };
};

/** Shape each provider module authenticates against. Free-form on purpose. */
export type ProviderCredentials =
  | { kind: "none"; [key: string]: unknown }
  | { kind: "api_key"; apiKey: string }
  | {
      kind: "credentials";
      accessKeyId: string;
      secretAccessKey: string;
      endpoint?: string;
      region?: string;
      bucket?: string;
      [key: string]: unknown;
    }
  | {
      kind: "oauth";
      accessToken: string;
      refreshToken?: string;
      expiresAt?: number;
      /** Pointer to the oauth_apps row used to mint this token. */
      oauthAppId: string;
    };

export type AuthContext = {
  /** Displayable account identifier — e.g. Google email, S3 bucket name. */
  accountLabel?: string;
  /** Provider-specific state to persist back into `providers.metadata`. */
  metadataPatch?: Record<string, unknown>;
};
