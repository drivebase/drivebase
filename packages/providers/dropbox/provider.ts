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
import { DropboxHttp, translateError, type FetchFn } from "./http.ts";
import {
  TokenStore,
  type DropboxTokens,
  type OAuthAppLookup,
  type PersistFn,
} from "./token-store.ts";

const CAPABILITIES: ProviderCapabilities = {
  isHierarchical: true,
  supportsNativeCopy: true,
  supportsNativeMove: true,
  supportsDelta: true,
  supportsChecksum: true,
  supportsMultipartUpload: false,
  supportsPresignedUploadParts: false,
};

const API = "https://api.dropboxapi.com/2";
const CONTENT = "https://content.dropboxapi.com/2";

type DropboxEntry = {
  ".tag": "file" | "folder" | "deleted";
  id: string;
  name: string;
  path_lower: string;
  path_display?: string;
  size?: number;
  content_hash?: string;
  client_modified?: string;
  server_modified?: string;
};

type ListFolderResult = {
  entries: DropboxEntry[];
  cursor: string;
  has_more: boolean;
  reset?: boolean;
};

type SpaceUsage = {
  used: number;
  allocation?: { ".tag": string; allocated?: number };
};

type Account = {
  email: string;
  name?: { display_name?: string };
};

type CopyMoveResult =
  | { metadata: DropboxEntry }
  | { async_job_id: string };

type JobStatus =
  | { ".tag": "complete"; metadata: DropboxEntry }
  | { ".tag": "in_progress" }
  | { ".tag": "failed"; failed?: unknown };

export type DropboxProviderOptions = {
  tokens: DropboxTokens;
  oauthApp: OAuthAppLookup;
  persistTokens?: PersistFn;
  fetchImpl?: FetchFn;
};

export class DropboxProvider implements IStorageProvider {
  readonly type = "dropbox";
  readonly capabilities = CAPABILITIES;
  private readonly http: DropboxHttp;

  constructor(opts: DropboxProviderOptions) {
    const store = new TokenStore(opts.tokens, opts.oauthApp, opts.persistTokens);
    this.http = new DropboxHttp(store, opts.fetchImpl);
  }

  async authenticate(creds: ProviderCredentials): Promise<AuthContext> {
    if (creds.kind !== "oauth") {
      throw new ProviderError(
        `dropbox requires kind='oauth', got '${creds.kind}'`,
        this.type,
      );
    }
    const account = await this.http.json<Account>(
      `${API}/users/get_current_account`,
      { method: "POST", headers: { "content-type": "application/json" }, body: "null" },
    );
    return {
      accountLabel: account.email,
      metadataPatch: { email: account.email },
    };
  }

  async listChildren(
    parentRemoteId: string | null,
    pageToken?: string,
  ): Promise<ListChildrenResult> {
    let res: ListFolderResult;

    if (pageToken) {
      res = await this.http.json<ListFolderResult>(
        `${API}/files/list_folder/continue`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cursor: pageToken }),
        },
      );
    } else {
      res = await this.http.json<ListFolderResult>(
        `${API}/files/list_folder`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            path: parentRemoteId ?? "",
            recursive: false,
            include_deleted: false,
          }),
        },
      );
    }

    const nodes = res.entries
      .filter((e) => e[".tag"] !== "deleted")
      .map(toRemoteNode);

    return {
      nodes,
      nextPageToken: res.has_more ? res.cursor : undefined,
    };
  }

  async getMetadata(remoteId: string): Promise<RemoteNode> {
    const entry = await this.http.json<DropboxEntry>(
      `${API}/files/get_metadata`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: remoteId }),
      },
    );
    return toRemoteNode(entry);
  }

  async download(remoteId: string): Promise<ReadableStream<Uint8Array>> {
    const res = await this.http.request(`${CONTENT}/files/download`, {
      method: "POST",
      headers: {
        "Dropbox-API-Arg": JSON.stringify({ path: remoteId }),
        "content-type": "",
      },
    });
    if (!res.ok || !res.body) {
      throw await translateError(res, `download(${remoteId})`);
    }
    return res.body;
  }

  async upload(args: UploadArgs): Promise<RemoteNode> {
    const destPath = joinPath(args.parentRemoteId, args.name);
    const uploadInit: RequestInit & { duplex?: "half" | "full" } = {
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: destPath,
          mode: "add",
          autorename: false,
          mute: false,
        }),
        ...(args.size != null ? { "content-length": String(args.size) } : {}),
      },
      body: args.stream,
      duplex: "half",
    };
    const entry = await this.http.json<DropboxEntry>(
      `${CONTENT}/files/upload`,
      uploadInit,
    );
    return toRemoteNode(entry);
  }

  async createFolder(
    parentRemoteId: string | null,
    name: string,
  ): Promise<RemoteNode> {
    const path = joinPath(parentRemoteId, name);
    const res = await this.http.json<{ metadata: DropboxEntry }>(
      `${API}/files/create_folder_v2`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path, autorename: false }),
      },
    );
    return toRemoteNode(res.metadata);
  }

  async move(
    remoteId: string,
    newParentRemoteId: string | null,
    newName?: string,
  ): Promise<RemoteNode> {
    const currentName = pathBasename(remoteId);
    const toPath = joinPath(newParentRemoteId, newName ?? currentName);
    const res = await this.http.json<CopyMoveResult>(
      `${API}/files/move_v2`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from_path: remoteId,
          to_path: toPath,
          autorename: false,
        }),
      },
    );
    if ("async_job_id" in res) {
      const metadata = await pollJob(
        this.http,
        `${API}/files/move_check_job_status`,
        res.async_job_id,
      );
      return toRemoteNode(metadata);
    }
    return toRemoteNode(res.metadata);
  }

  async copy(
    remoteId: string,
    newParentRemoteId: string | null,
    newName?: string,
  ): Promise<RemoteNode> {
    const currentName = pathBasename(remoteId);
    const toPath = joinPath(newParentRemoteId, newName ?? currentName);
    const res = await this.http.json<CopyMoveResult>(
      `${API}/files/copy_v2`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          from_path: remoteId,
          to_path: toPath,
          autorename: false,
        }),
      },
    );
    if ("async_job_id" in res) {
      const metadata = await pollJob(
        this.http,
        `${API}/files/copy_check_job_status`,
        res.async_job_id,
      );
      return toRemoteNode(metadata);
    }
    return toRemoteNode(res.metadata);
  }

  async delete(remoteId: string): Promise<void> {
    await this.http.json(
      `${API}/files/delete_v2`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: remoteId }),
      },
    );
  }

  async getUsage(): Promise<UsageSnapshot> {
    const usage = await this.http.json<SpaceUsage>(
      `${API}/users/get_space_usage`,
      { method: "POST", headers: { "content-type": "application/json" }, body: "null" },
    );
    const used = usage.used;
    const total =
      usage.allocation?.allocated != null
        ? usage.allocation.allocated
        : undefined;
    return {
      used,
      total,
      available:
        total != null ? Math.max(total - used, 0) : undefined,
    };
  }

  async *listChanges(cursor?: string): AsyncIterable<ChangeEvent> {
    if (!cursor) {
      return;
    }

    let token: string | undefined = cursor;
    while (token) {
      const res: ListFolderResult = await this.http.json<ListFolderResult>(
        `${API}/files/list_folder/continue`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ cursor: token }),
        },
      );

      if (res.reset) {
        throw new ProviderError(
          "dropbox delta cursor expired — full resync required",
          "dropbox",
        );
      }

      for (const entry of res.entries) {
        if (entry[".tag"] === "deleted") {
          yield { kind: "delete", remoteId: entry.path_lower };
        } else {
          yield { kind: "upsert", node: toRemoteNode(entry) };
        }
      }

      token = res.has_more ? res.cursor : undefined;
    }
  }

  async seedCursor(): Promise<string> {
    const res = await this.http.json<{ cursor: string }>(
      `${API}/files/list_folder/get_latest_cursor`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          path: "",
          recursive: true,
          include_deleted: true,
          include_media_info: false,
        }),
      },
    );
    return res.cursor;
  }
}

async function pollJob(
  http: DropboxHttp,
  endpoint: string,
  jobId: string,
): Promise<DropboxEntry> {
  const MAX_WAIT_MS = 30_000;
  const start = Date.now();
  let delay = 500;

  while (Date.now() - start < MAX_WAIT_MS) {
    await sleep(delay);
    delay = Math.min(delay * 2, 4000);

    const status = await http.json<JobStatus>(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ async_job_id: jobId }),
    });

    if (status[".tag"] === "complete") return status.metadata;
    if (status[".tag"] === "failed") {
      throw new ProviderError(
        `dropbox async job failed: ${JSON.stringify(status.failed)}`,
        "dropbox",
      );
    }
  }
  throw new ProviderError(
    `dropbox async job ${jobId} timed out after ${MAX_WAIT_MS}ms`,
    "dropbox",
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toRemoteNode(entry: DropboxEntry): RemoteNode {
  const isFolder = entry[".tag"] === "folder";
  const parentRemoteId = pathParent(entry.path_lower);
  return {
    remoteId: entry.path_lower,
    name: entry.name,
    type: isFolder ? "folder" : "file",
    parentRemoteId,
    size: entry.size,
    checksum: entry.content_hash,
    remoteCreatedAt: entry.client_modified
      ? new Date(entry.client_modified)
      : undefined,
    remoteUpdatedAt: entry.server_modified
      ? new Date(entry.server_modified)
      : undefined,
  };
}

function joinPath(parent: string | null, name: string): string {
  const base = parent ?? "";
  return base === "" ? `/${name}` : `${base}/${name}`;
}

function pathParent(path: string): string | null {
  const lastSlash = path.lastIndexOf("/");
  if (lastSlash <= 0) return null;
  return path.substring(0, lastSlash);
}

function pathBasename(path: string): string {
  return path.substring(path.lastIndexOf("/") + 1);
}
