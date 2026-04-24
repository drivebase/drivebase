import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
  type _Object,
  type CommonPrefix,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  AuthError,
  NotFoundError,
  ProviderError,
  type AuthContext,
  type IStorageProvider,
  type ListChildrenResult,
  type ProviderCapabilities,
  type ProviderCredentials,
  type RemoteNode,
  type UploadArgs,
  type UsageSnapshot,
} from "@drivebase/storage";
import { assertS3Creds, buildS3Client, type S3Creds } from "./client.ts";
import { nameFromKey, parseRemoteId, toPrefix } from "./keys.ts";

const CAPABILITIES: ProviderCapabilities = {
  isHierarchical: false,
  supportsNativeCopy: true,
  // S3 has no native move; we expose `move` as copy + delete (see move()).
  supportsNativeMove: false,
  supportsDelta: false,
  supportsChecksum: true,
  // S3 has first-class multipart + presigned URLs; direct-mode uploads
  // go browser → S3.
  supportsMultipartUpload: true,
  supportsPresignedUploadParts: true,
};

export class S3Provider implements IStorageProvider {
  readonly type = "s3";
  readonly capabilities = CAPABILITIES;
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly creds: S3Creds) {
    this.client = buildS3Client(creds);
    this.bucket = creds.bucket;
  }

  async authenticate(credentials: ProviderCredentials): Promise<AuthContext> {
    const c = assertS3Creds(credentials);
    // Sanity-check bucket existence by listing a single key.
    const probe = new S3Client({
      region: c.region ?? "us-east-1",
      endpoint: c.endpoint,
      forcePathStyle: !!c.endpoint,
      credentials: {
        accessKeyId: c.accessKeyId,
        secretAccessKey: c.secretAccessKey,
      },
    });
    try {
      await probe.send(
        new ListObjectsV2Command({ Bucket: c.bucket, MaxKeys: 1 }),
      );
    } catch (e) {
      throw new AuthError(`s3 authentication failed: ${(e as Error).message}`);
    } finally {
      probe.destroy();
    }
    return { accountLabel: c.bucket, metadataPatch: { bucket: c.bucket } };
  }

  async listChildren(
    parentRemoteId: string | null,
    pageToken?: string,
  ): Promise<ListChildrenResult> {
    const prefix = toPrefix(parentRemoteId);
    const res = await this.client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        Delimiter: "/",
        ContinuationToken: pageToken,
      }),
    );

    const nodes: RemoteNode[] = [];

    for (const cp of res.CommonPrefixes ?? []) {
      const p = (cp as CommonPrefix).Prefix;
      if (!p || p === prefix) continue;
      nodes.push({
        remoteId: p,
        name: nameFromKey(p),
        type: "folder",
        parentRemoteId: prefix === "" ? null : prefix,
      });
    }

    for (const o of res.Contents ?? []) {
      const obj = o as _Object;
      if (!obj.Key) continue;
      // The zero-byte "foo/" placeholder objects would appear here too —
      // skip them so we don't double-count folders listed via CommonPrefixes.
      if (obj.Key === prefix) continue;
      if (obj.Key.endsWith("/")) continue;
      nodes.push({
        remoteId: obj.Key,
        name: nameFromKey(obj.Key),
        type: "file",
        parentRemoteId: prefix === "" ? null : prefix,
        size: obj.Size ?? 0,
        checksum: obj.ETag?.replaceAll('"', ""),
        remoteUpdatedAt: obj.LastModified,
      });
    }

    return {
      nodes,
      nextPageToken: res.IsTruncated ? res.NextContinuationToken : undefined,
    };
  }

  async getMetadata(remoteId: string): Promise<RemoteNode> {
    const ref = parseRemoteId(remoteId);
    if (ref.kind === "root") {
      return {
        remoteId: "",
        name: "",
        type: "folder",
        parentRemoteId: null,
      };
    }
    if (ref.kind === "folder") {
      return {
        remoteId: ref.prefix,
        name: nameFromKey(ref.prefix),
        type: "folder",
        parentRemoteId: folderParent(ref.prefix),
      };
    }
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: ref.key }),
      );
      return {
        remoteId: ref.key,
        name: nameFromKey(ref.key),
        type: "file",
        parentRemoteId: fileParent(ref.key),
        size: res.ContentLength ?? 0,
        mimeType: res.ContentType,
        checksum: res.ETag?.replaceAll('"', ""),
        remoteUpdatedAt: res.LastModified,
      };
    } catch (e) {
      throw translateAwsError(e, `getMetadata(${remoteId})`);
    }
  }

  async download(remoteId: string): Promise<ReadableStream<Uint8Array>> {
    const ref = parseRemoteId(remoteId);
    if (ref.kind !== "file") {
      throw new ProviderError(
        `cannot download non-file remoteId: ${remoteId}`,
        this.type,
      );
    }
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: ref.key }),
      );
      const body = res.Body;
      if (!body) {
        throw new ProviderError("s3 returned no body", this.type);
      }
      // aws-sdk v3 Node Body is a Readable; transformToWebStream returns ReadableStream.
      if ("transformToWebStream" in body) {
        return body.transformToWebStream();
      }
      throw new ProviderError(
        "s3 response body does not expose a web stream",
        this.type,
      );
    } catch (e) {
      throw translateAwsError(e, `download(${remoteId})`);
    }
  }

  async upload(args: UploadArgs): Promise<RemoteNode> {
    const prefix = toPrefix(args.parentRemoteId);
    const key = `${prefix}${args.name}`;

    // lib-storage's Upload handles multipart transparently for large streams,
    // and single PutObject for small ones. Works against any S3-compatible endpoint.
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: args.stream,
        ContentType: args.mimeType,
        ContentLength: args.size,
      },
      queueSize: 4,
      partSize: 8 * 1024 * 1024,
      leavePartsOnError: false,
    });
    try {
      await upload.done();
    } catch (e) {
      throw translateAwsError(e, `upload(${key})`);
    }
    const head = await this.client.send(
      new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      remoteId: key,
      name: args.name,
      type: "file",
      parentRemoteId: prefix === "" ? null : prefix,
      size: head.ContentLength ?? args.size ?? 0,
      mimeType: head.ContentType ?? args.mimeType,
      checksum: head.ETag?.replaceAll('"', ""),
      remoteUpdatedAt: head.LastModified,
    };
  }

  async createFolder(
    parentRemoteId: string | null,
    name: string,
  ): Promise<RemoteNode> {
    const prefix = toPrefix(parentRemoteId);
    const folderKey = `${prefix}${name}/`;
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: folderKey,
          Body: new Uint8Array(),
        }),
      );
    } catch (e) {
      throw translateAwsError(e, `createFolder(${folderKey})`);
    }
    return {
      remoteId: folderKey,
      name,
      type: "folder",
      parentRemoteId: prefix === "" ? null : prefix,
    };
  }

  async move(
    remoteId: string,
    newParentRemoteId: string | null,
    newName?: string,
  ): Promise<RemoteNode> {
    // Emulated as copy + delete. Works for files; folders require recursive
    // copy which the orchestrator handles by decomposing into per-file jobs,
    // so we don't implement folder-move here.
    const ref = parseRemoteId(remoteId);
    if (ref.kind !== "file") {
      throw new ProviderError(
        "s3 folder move must be decomposed by the orchestrator",
        this.type,
      );
    }
    const copied = await this.copy(remoteId, newParentRemoteId, newName);
    await this.delete(remoteId);
    return copied;
  }

  async copy(
    remoteId: string,
    newParentRemoteId: string | null,
    newName?: string,
  ): Promise<RemoteNode> {
    const ref = parseRemoteId(remoteId);
    if (ref.kind !== "file") {
      throw new ProviderError(
        "s3 folder copy must be decomposed by the orchestrator",
        this.type,
      );
    }
    const newPrefix = toPrefix(newParentRemoteId);
    const name = newName ?? nameFromKey(ref.key);
    const newKey = `${newPrefix}${name}`;
    try {
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.bucket,
          Key: newKey,
          CopySource: `/${this.bucket}/${encodeURIComponent(ref.key).replaceAll("%2F", "/")}`,
        }),
      );
    } catch (e) {
      throw translateAwsError(e, `copy(${ref.key} -> ${newKey})`);
    }
    return await this.getMetadata(newKey);
  }

  async delete(remoteId: string): Promise<void> {
    const ref = parseRemoteId(remoteId);
    if (ref.kind === "root") {
      throw new ProviderError("refusing to delete bucket root", this.type);
    }
    if (ref.kind === "file") {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: ref.key }),
      );
      return;
    }
    // Folder: recursive list + batched delete. Safe because S3 has no
    // native folders — deleting a prefix just deletes all objects under it.
    let token: string | undefined;
    do {
      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: ref.prefix,
          ContinuationToken: token,
        }),
      );
      const keys = (res.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => typeof k === "string");
      if (keys.length > 0) {
        // DeleteObjects supports up to 1000 keys per call; ListObjectsV2
        // returns at most 1000 per page, so one-to-one is safe.
        await this.client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
          }),
        );
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
  }

  // ---------------------------------------------------------------------
  // Multipart upload surface — direct-mode uploads use this plus presigned
  // URLs so bytes flow browser → S3 without touching our process.
  // ---------------------------------------------------------------------

  async initiateMultipart(args: {
    parentRemoteId: string | null;
    name: string;
    mimeType?: string;
  }): Promise<{ uploadId: string; key: string }> {
    const prefix = toPrefix(args.parentRemoteId);
    const key = `${prefix}${args.name}`;
    try {
      const res = await this.client.send(
        new CreateMultipartUploadCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: args.mimeType,
        }),
      );
      if (!res.UploadId) {
        throw new ProviderError("s3 returned no upload id", this.type);
      }
      return { uploadId: res.UploadId, key };
    } catch (e) {
      throw translateAwsError(e, `initiateMultipart(${key})`);
    }
  }

  async uploadPart(args: {
    uploadId: string;
    key: string;
    partNumber: number;
    body: Uint8Array | ReadableStream<Uint8Array>;
    size: number;
  }): Promise<{ etag: string }> {
    // UploadPartCommand accepts Buffer/Uint8Array/stream; we require a
    // concrete size so signing and retries behave.
    try {
      const res = await this.client.send(
        new UploadPartCommand({
          Bucket: this.bucket,
          Key: args.key,
          UploadId: args.uploadId,
          PartNumber: args.partNumber,
          Body: args.body,
          ContentLength: args.size,
        }),
      );
      if (!res.ETag) {
        throw new ProviderError(
          `s3 uploadPart(${args.partNumber}) returned no ETag`,
          this.type,
        );
      }
      return { etag: res.ETag.replaceAll('"', "") };
    } catch (e) {
      throw translateAwsError(
        e,
        `uploadPart(${args.key}#${args.partNumber})`,
      );
    }
  }

  async completeMultipart(args: {
    uploadId: string;
    key: string;
    parts: Array<{ partNumber: number; etag: string }>;
  }): Promise<RemoteNode> {
    // S3 requires parts in ascending PartNumber order, and each ETag must
    // match exactly what UploadPart returned — quoted. We re-quote here to
    // be tolerant of callers that stripped them.
    const ordered = [...args.parts].sort(
      (a, b) => a.partNumber - b.partNumber,
    );
    try {
      await this.client.send(
        new CompleteMultipartUploadCommand({
          Bucket: this.bucket,
          Key: args.key,
          UploadId: args.uploadId,
          MultipartUpload: {
            Parts: ordered.map((p) => ({
              PartNumber: p.partNumber,
              ETag: p.etag.startsWith('"') ? p.etag : `"${p.etag}"`,
            })),
          },
        }),
      );
    } catch (e) {
      throw translateAwsError(e, `completeMultipart(${args.key})`);
    }
    // Head the object so we return accurate size/etag/updatedAt.
    return await this.getMetadata(args.key);
  }

  async abortMultipart(args: {
    uploadId: string;
    key: string;
  }): Promise<void> {
    try {
      await this.client.send(
        new AbortMultipartUploadCommand({
          Bucket: this.bucket,
          Key: args.key,
          UploadId: args.uploadId,
        }),
      );
    } catch (e) {
      throw translateAwsError(e, `abortMultipart(${args.key})`);
    }
  }

  async generatePresignedPartUrls(args: {
    uploadId: string;
    key: string;
    partNumbers: number[];
    expiresInSeconds?: number;
  }): Promise<Array<{ partNumber: number; url: string }>> {
    // Signing is CPU-local — no network call — so this is cheap even
    // for thousand-part uploads. 15 min TTL is enough for the browser
    // to PUT one part over a slow link; the client can request fresh
    // URLs if needed (not supported yet).
    const expiresIn = args.expiresInSeconds ?? 15 * 60;
    const out: Array<{ partNumber: number; url: string }> = [];
    for (const partNumber of args.partNumbers) {
      const cmd = new UploadPartCommand({
        Bucket: this.bucket,
        Key: args.key,
        UploadId: args.uploadId,
        PartNumber: partNumber,
      });
      const url = await getSignedUrl(this.client, cmd, { expiresIn });
      out.push({ partNumber, url });
    }
    return out;
  }

  async getUsage(): Promise<UsageSnapshot> {
    // S3 doesn't expose total bytes available per bucket — compute `used`.
    let used = 0;
    let token: string | undefined;
    do {
      const res = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          ContinuationToken: token,
        }),
      );
      for (const o of res.Contents ?? []) used += o.Size ?? 0;
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return { used };
  }
}

function folderParent(prefix: string): string | null {
  const stripped = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const idx = stripped.lastIndexOf("/");
  if (idx === -1) return null;
  return `${stripped.slice(0, idx)}/`;
}

function fileParent(key: string): string | null {
  const idx = key.lastIndexOf("/");
  if (idx === -1) return null;
  return key.slice(0, idx + 1);
}

function translateAwsError(e: unknown, ctx: string): Error {
  const name = (e as { name?: string })?.name;
  if (name === "NoSuchKey" || name === "NotFound") {
    return new NotFoundError(`${ctx}: not found`);
  }
  if (name === "AccessDenied" || name === "InvalidAccessKeyId") {
    return new AuthError(`${ctx}: ${name}`);
  }
  return new ProviderError(`${ctx}: ${(e as Error).message}`, "s3", e);
}
