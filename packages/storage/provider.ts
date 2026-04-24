import type {
  AuthContext,
  ChangeEvent,
  ProviderCapabilities,
  ProviderCredentials,
  RemoteNode,
  UsageSnapshot,
} from "./types.ts";

export type UploadArgs = {
  parentRemoteId: string | null;
  name: string;
  stream: ReadableStream<Uint8Array>;
  size?: number;
  mimeType?: string;
};

export type ListChildrenResult = {
  nodes: RemoteNode[];
  nextPageToken?: string;
};

/**
 * Every provider implements this. Methods are provider-agnostic and
 * never contain conflict-resolution logic (that lives in the orchestrator).
 */
export interface IStorageProvider {
  readonly type: string;
  readonly capabilities: ProviderCapabilities;

  authenticate(creds: ProviderCredentials): Promise<AuthContext>;

  listChildren(
    parentRemoteId: string | null,
    pageToken?: string,
  ): Promise<ListChildrenResult>;

  getMetadata(remoteId: string): Promise<RemoteNode>;

  download(remoteId: string): Promise<ReadableStream<Uint8Array>>;

  upload(args: UploadArgs): Promise<RemoteNode>;

  createFolder(
    parentRemoteId: string | null,
    name: string,
  ): Promise<RemoteNode>;

  move(
    remoteId: string,
    newParentRemoteId: string | null,
    newName?: string,
  ): Promise<RemoteNode>;

  copy(
    remoteId: string,
    newParentRemoteId: string | null,
    newName?: string,
  ): Promise<RemoteNode>;

  delete(remoteId: string): Promise<void>;

  getUsage(): Promise<UsageSnapshot>;

  /** Delta sync — optional; check `capabilities.supportsDelta`. */
  listChanges?(cursor?: string): AsyncIterable<ChangeEvent>;

  // ---------------------------------------------------------------------
  // Multipart upload surface. Non-null iff
  // `capabilities.supportsMultipartUpload` is true. Callers MUST guard on
  // the capability flag rather than probing for undefined methods.
  //
  // Lifecycle: initiate → uploadPart × N → complete   (or → abort).
  // ---------------------------------------------------------------------

  /** Allocate a new upstream multipart upload. Returns the upload id and the destination key. */
  initiateMultipart?(args: {
    parentRemoteId: string | null;
    name: string;
    mimeType?: string;
    size?: number;
  }): Promise<{ uploadId: string; key: string }>;

  /**
   * Upload a single part. Part numbers are 1-based and must be monotonic
   * per upload id. Returns the ETag the upstream assigned — needed at
   * completion time.
   */
  uploadPart?(args: {
    uploadId: string;
    key: string;
    partNumber: number;
    body: Uint8Array | ReadableStream<Uint8Array>;
    size: number;
  }): Promise<{ etag: string }>;

  /**
   * Assemble previously-uploaded parts into the final object and return
   * the materialized `RemoteNode`. Parts must be in ascending `partNumber`
   * order; etags must match what `uploadPart` / presigned PUT returned.
   */
  completeMultipart?(args: {
    uploadId: string;
    key: string;
    parts: Array<{ partNumber: number; etag: string }>;
  }): Promise<RemoteNode>;

  /** Cancel a multipart upload and release any parked parts (S3 bills for these). */
  abortMultipart?(args: { uploadId: string; key: string }): Promise<void>;

  /**
   * Hand the client short-TTL URLs it can PUT parts to directly
   * (browser → upstream, bypassing our process). Non-null iff
   * `capabilities.supportsPresignedUploadParts` is true.
   */
  generatePresignedPartUrls?(args: {
    uploadId: string;
    key: string;
    partNumbers: number[];
    expiresInSeconds?: number;
  }): Promise<Array<{ partNumber: number; url: string }>>;
}

/**
 * OAuth-specific hooks. A provider type that uses OAuth implements this
 * in addition to IStorageProvider. The orchestrator/API uses the
 * namespace functions (not per-instance) to build the authorize URL and
 * swap an authorization code for tokens.
 */
export type OAuthProviderModule = {
  /** Scopes the provider needs. Kept here so the oauth_apps table doesn't have to. */
  readonly scopes: string[];
  /** Full authorize URL including client_id, redirect_uri, state, etc. */
  buildAuthorizeUrl(args: {
    clientId: string;
    redirectUri: string;
    state: string;
  }): string;
  /** Swap an authorization code for access/refresh tokens. */
  exchangeCode(args: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    code: string;
  }): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  }>;
  /** Refresh an expired access token. */
  refreshToken(args: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
  }): Promise<{ accessToken: string; expiresAt?: number }>;
};
