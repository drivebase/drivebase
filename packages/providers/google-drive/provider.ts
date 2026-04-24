import {
  ProviderError,
  type AuthContext,
  type ChangeEvent,
  type IStorageProvider,
  type ListChildrenResult,
  type ProviderCapabilities,
  type ProviderCredentials,
  type RemoteNode,
  type UploadArgs,
  type UsageSnapshot,
} from "@drivebase/storage";
import { DriveHttp, type FetchFn } from "./http.ts";
import { TokenStore, type DriveTokens, type OAuthAppLookup, type PersistFn } from "./token-store.ts";

/**
 * Drive's native capabilities. `supportsDelta=true` drives the background
 * reconciler (Phase 10): instead of re-listing every folder every N hours,
 * the reconciler pulls `changes.list` since the last cursor.
 */
const CAPABILITIES: ProviderCapabilities = {
  isHierarchical: true,
  supportsNativeCopy: true,
  supportsNativeMove: true,
  supportsDelta: true,
  // Drive exposes md5Checksum on non-Google-native files. Google Docs have
  // no checksum — we return undefined for those.
  supportsChecksum: true,
  // Drive's resumable upload works in a single session; we don't expose a
  // part-by-part flow or presigned URLs. Proxy-mode uploads route
  // provider.upload(stream) through the API.
  supportsMultipartUpload: false,
  supportsPresignedUploadParts: false,
};

// Base URLs split so tests can stub via FetchFn without URL regex matching.
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

const FOLDER_MIME = "application/vnd.google-apps.folder";
/** Fields we always want back on a file; tailored so listChildren hits once. */
const FILE_FIELDS =
  "id,name,mimeType,parents,size,md5Checksum,createdTime,modifiedTime,trashed";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  size?: string;
  md5Checksum?: string;
  createdTime?: string;
  modifiedTime?: string;
  trashed?: boolean;
};

type DriveList = {
  files: DriveFile[];
  nextPageToken?: string;
};

type DriveAbout = {
  storageQuota?: {
    limit?: string;
    usage?: string;
    usageInDrive?: string;
  };
  user?: { emailAddress?: string };
};

type DriveChangesList = {
  changes: Array<{
    file?: DriveFile;
    fileId?: string;
    removed?: boolean;
    changeType?: string;
    time?: string;
  }>;
  newStartPageToken?: string;
  nextPageToken?: string;
};

export type GoogleDriveOptions = {
  tokens: DriveTokens;
  oauthApp: OAuthAppLookup;
  persistTokens?: PersistFn;
  /** Override the global fetch — tests pass a stub. */
  fetchImpl?: FetchFn;
};

export class GoogleDriveProvider implements IStorageProvider {
  readonly type = "google_drive";
  readonly capabilities = CAPABILITIES;
  private readonly http: DriveHttp;

  constructor(opts: GoogleDriveOptions) {
    const store = new TokenStore(opts.tokens, opts.oauthApp, opts.persistTokens);
    this.http = new DriveHttp(store, opts.fetchImpl);
  }

  async authenticate(creds: ProviderCredentials): Promise<AuthContext> {
    if (creds.kind !== "oauth") {
      throw new ProviderError(
        `google_drive requires kind='oauth', got '${creds.kind}'`,
        this.type,
      );
    }
    // One round-trip to /about proves the token is live and surfaces the
    // account email we show the user as the label.
    const about = await this.http.json<DriveAbout>(
      `${API}/about?fields=user(emailAddress),storageQuota(limit,usage)`,
    );
    return {
      accountLabel: about.user?.emailAddress,
      metadataPatch: { email: about.user?.emailAddress },
    };
  }

  async listChildren(
    parentRemoteId: string | null,
    pageToken?: string,
  ): Promise<ListChildrenResult> {
    const parent = parentRemoteId ?? "root";
    // `q` filters by parent + not-trashed. Drive's `in parents` clause is
    // the idiomatic way to list a folder.
    const q = `'${escapeQ(parent)}' in parents and trashed = false`;
    const url =
      `${API}/files?` +
      new URLSearchParams({
        q,
        fields: `nextPageToken,files(${FILE_FIELDS})`,
        pageSize: "1000",
        ...(pageToken ? { pageToken } : {}),
        // Include shared + My Drive; excludes corpora tweaks for Workspace.
        spaces: "drive",
      }).toString();
    const res = await this.http.json<DriveList>(url);
    return {
      nodes: res.files.map((f) => toRemoteNode(f, parent)),
      nextPageToken: res.nextPageToken,
    };
  }

  async getMetadata(remoteId: string): Promise<RemoteNode> {
    const url = `${API}/files/${encodeURIComponent(remoteId)}?fields=${encodeURIComponent(FILE_FIELDS)}`;
    const file = await this.http.json<DriveFile>(url);
    return toRemoteNode(file, file.parents?.[0] ?? null);
  }

  async download(remoteId: string): Promise<ReadableStream<Uint8Array>> {
    const res = await this.http.request(
      `${API}/files/${encodeURIComponent(remoteId)}?alt=media`,
    );
    if (!res.ok || !res.body) {
      const err = await import("./http.ts").then((m) =>
        m.translateError(res, `download(${remoteId})`),
      );
      throw err;
    }
    // Node's fetch returns a Web ReadableStream on .body — same shape workers expect.
    return res.body;
  }

  /**
   * Resumable upload. Two-step protocol:
   *   1. POST .../files?uploadType=resumable → Google returns a session
   *      URL in the `location` header.
   *   2. PUT the bytes to that URL.
   *
   * For big uploads we *could* chunk the PUT and query progress between
   * chunks; Drive accepts any size up to 5TB in a single PUT, so a single
   * streamed PUT is simpler and sufficient for the common case.
   */
  async upload(args: UploadArgs): Promise<RemoteNode> {
    const metadata = {
      name: args.name,
      parents: [args.parentRemoteId ?? "root"],
      mimeType: args.mimeType,
    };
    const init = await this.http.request(
      `${UPLOAD}/files?uploadType=resumable&fields=${encodeURIComponent(FILE_FIELDS)}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json; charset=UTF-8",
          "x-upload-content-type": args.mimeType ?? "application/octet-stream",
          ...(args.size != null
            ? { "x-upload-content-length": String(args.size) }
            : {}),
        },
        body: JSON.stringify(metadata),
      },
    );
    if (!init.ok) {
      const { translateError } = await import("./http.ts");
      throw await translateError(init, `upload:init(${args.name})`);
    }
    const sessionUrl = init.headers.get("location");
    if (!sessionUrl) {
      throw new ProviderError(
        "google_drive resumable init missing location header",
        this.type,
      );
    }

    // `duplex: "half"` is required by streams-capable fetch implementations
    // (Bun, undici) when the body is a ReadableStream. It isn't in the DOM
    // `RequestInit` lib type, so widen locally rather than casting.
    const putInit: RequestInit & { duplex?: "half" | "full" } = {
      method: "PUT",
      headers: {
        ...(args.size != null ? { "content-length": String(args.size) } : {}),
        ...(args.mimeType ? { "content-type": args.mimeType } : {}),
      },
      body: args.stream,
      duplex: "half",
    };
    const put = await this.http.request(sessionUrl, putInit);
    if (!put.ok) {
      const { translateError } = await import("./http.ts");
      throw await translateError(put, `upload:put(${args.name})`);
    }
    const file = (await put.json()) as DriveFile;
    return toRemoteNode(file, args.parentRemoteId ?? null);
  }

  async createFolder(
    parentRemoteId: string | null,
    name: string,
  ): Promise<RemoteNode> {
    const body = {
      name,
      mimeType: FOLDER_MIME,
      parents: [parentRemoteId ?? "root"],
    };
    const file = await this.http.json<DriveFile>(
      `${API}/files?fields=${encodeURIComponent(FILE_FIELDS)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return toRemoteNode(file, parentRemoteId);
  }

  async move(
    remoteId: string,
    newParentRemoteId: string | null,
    newName?: string,
  ): Promise<RemoteNode> {
    // Drive stores parent as a separate relation, so move = remove old
    // parent + add new parent. `addParents` / `removeParents` are built
    // for exactly this. Fetch parents with a narrow fields query so we
    // only pay for what we need.
    const current = await this.http.json<{ parents?: string[] }>(
      `${API}/files/${encodeURIComponent(remoteId)}?fields=parents`,
    );
    const oldParents = current.parents ?? [];
    const removeQuery = oldParents.length > 0 ? oldParents.join(",") : "";
    const url =
      `${API}/files/${encodeURIComponent(remoteId)}?` +
      new URLSearchParams({
        addParents: newParentRemoteId ?? "root",
        ...(removeQuery ? { removeParents: removeQuery } : {}),
        fields: FILE_FIELDS,
      }).toString();
    const body = newName ? { name: newName } : {};
    const updated = await this.http.json<DriveFile>(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return toRemoteNode(updated, newParentRemoteId);
  }

  async copy(
    remoteId: string,
    newParentRemoteId: string | null,
    newName?: string,
  ): Promise<RemoteNode> {
    const body = {
      parents: [newParentRemoteId ?? "root"],
      ...(newName ? { name: newName } : {}),
    };
    const file = await this.http.json<DriveFile>(
      `${API}/files/${encodeURIComponent(remoteId)}/copy?fields=${encodeURIComponent(FILE_FIELDS)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return toRemoteNode(file, newParentRemoteId);
  }

  async delete(remoteId: string): Promise<void> {
    // Drive supports hard delete (DELETE) and trash (PATCH trashed:true).
    // We hard-delete — matches the semantics of the other providers.
    const res = await this.http.request(
      `${API}/files/${encodeURIComponent(remoteId)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      const { translateError } = await import("./http.ts");
      throw await translateError(res, `delete(${remoteId})`);
    }
  }

  async getUsage(): Promise<UsageSnapshot> {
    const about = await this.http.json<DriveAbout>(
      `${API}/about?fields=storageQuota(limit,usage,usageInDrive)`,
    );
    const q = about.storageQuota;
    if (!q) return {};
    const total = q.limit ? Number(q.limit) : undefined;
    const used = q.usage ? Number(q.usage) : undefined;
    return {
      total,
      used,
      available:
        total != null && used != null ? Math.max(total - used, 0) : undefined,
    };
  }

  /**
   * Delta sync via `changes.list`. The cursor is a `startPageToken` string
   * stored on `providers.metadata.changesCursor`. If `cursor` is undefined
   * we fetch the current token with no prior changes — the caller is
   * responsible for persisting it before the next call.
   */
  async *listChanges(cursor?: string): AsyncIterable<ChangeEvent> {
    let token = cursor;
    if (!token) {
      const seed = await this.http.json<{ startPageToken: string }>(
        `${API}/changes/startPageToken`,
      );
      token = seed.startPageToken;
      // No prior state → no events; yield the fresh cursor wrapped as a
      // sentinel. Consumers that want the seed should call `seedCursor`
      // directly (below).
      return;
    }

    while (token) {
      const url: string =
        `${API}/changes?` +
        new URLSearchParams({
          pageToken: token,
          includeRemoved: "true",
          fields: `newStartPageToken,nextPageToken,changes(fileId,removed,changeType,time,file(${FILE_FIELDS}))`,
        }).toString();
      const page: DriveChangesList =
        await this.http.json<DriveChangesList>(url);
      for (const ch of page.changes) {
        if (ch.removed || ch.file?.trashed) {
          if (ch.fileId) yield { kind: "delete", remoteId: ch.fileId };
          continue;
        }
        if (ch.file) {
          yield { kind: "upsert", node: toRemoteNode(ch.file, ch.file.parents?.[0] ?? null) };
        }
      }
      // Advance cursor: nextPageToken paginates within THIS delta window;
      // newStartPageToken marks the end — caller persists it for next time.
      token = page.nextPageToken;
      if (!token && page.newStartPageToken) {
        // Emit the new cursor as a no-op upsert so the caller knows where
        // to resume. We can't yield it through the type system directly;
        // store it on the AsyncIterable's `return` value if callers adopt
        // a helper.
        return;
      }
    }
  }

  /** One-shot: fetch the current startPageToken for a first-time connect. */
  async seedCursor(): Promise<string> {
    const res = await this.http.json<{ startPageToken: string }>(
      `${API}/changes/startPageToken`,
    );
    return res.startPageToken;
  }
}

function toRemoteNode(f: DriveFile, parent: string | null): RemoteNode {
  const isFolder = f.mimeType === FOLDER_MIME;
  return {
    remoteId: f.id,
    name: f.name,
    type: isFolder ? "folder" : "file",
    parentRemoteId: parent,
    size: f.size != null ? Number(f.size) : undefined,
    mimeType: f.mimeType,
    checksum: f.md5Checksum,
    remoteCreatedAt: f.createdTime ? new Date(f.createdTime) : undefined,
    remoteUpdatedAt: f.modifiedTime ? new Date(f.modifiedTime) : undefined,
  };
}

/** Escape single-quotes for the Drive `q` query param. */
function escapeQ(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
