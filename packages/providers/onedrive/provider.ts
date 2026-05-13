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
import { OneDriveHttp, translateError, type FetchFn } from "./http.ts";
import {
  TokenStore,
  type OneDriveTokens,
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

const API = "https://graph.microsoft.com/v1.0/me/drive";

const ITEM_FIELDS =
  "id,name,file,folder,parentReference,size,fileSystemInfo,deleted";

type GraphItem = {
  id: string;
  name: string;
  file?: {
    mimeType?: string;
    hashes?: { sha1Hash?: string; sha256Hash?: string };
  };
  folder?: Record<string, unknown>;
  parentReference?: { id?: string; path?: string };
  size?: number;
  fileSystemInfo?: {
    createdDateTime?: string;
    lastModifiedDateTime?: string;
  };
  deleted?: Record<string, unknown>;
};

type ListResponse = {
  value: GraphItem[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
};

type DriveInfo = {
  quota?: { total?: number; used?: number; remaining?: number };
};

type UserInfo = {
  displayName?: string;
  userPrincipalName?: string;
};

type CopyResponse = {
  id?: string;
  name?: string;
};

export type OneDriveProviderOptions = {
  tokens: OneDriveTokens;
  oauthApp: OAuthAppLookup;
  persistTokens?: PersistFn;
  fetchImpl?: FetchFn;
};

export class OneDriveProvider implements IStorageProvider {
  readonly type = "onedrive";
  readonly capabilities = CAPABILITIES;
  private readonly http: OneDriveHttp;
  private rootId?: string;

  constructor(opts: OneDriveProviderOptions) {
    const store = new TokenStore(opts.tokens, opts.oauthApp, opts.persistTokens);
    this.http = new OneDriveHttp(store, opts.fetchImpl);
  }

  async authenticate(creds: ProviderCredentials): Promise<AuthContext> {
    if (creds.kind !== "oauth") {
      throw new ProviderError(
        `onedrive requires kind='oauth', got '${creds.kind}'`,
        this.type,
      );
    }
    const user = await this.http.json<UserInfo>(
      "https://graph.microsoft.com/v1.0/me?$select=displayName,userPrincipalName",
    );
    const label = user.userPrincipalName ?? user.displayName;
    return {
      accountLabel: label,
      metadataPatch: { email: user.userPrincipalName },
    };
  }

  async listChildren(
    parentRemoteId: string | null,
    pageToken?: string,
  ): Promise<ListChildrenResult> {
    const url =
      pageToken ??
      (parentRemoteId == null
        ? `${API}/root/children?$select=${ITEM_FIELDS}`
        : `${API}/items/${encodeURIComponent(parentRemoteId)}/children?$select=${ITEM_FIELDS}`);

    const res = await this.http.json<ListResponse>(url);
    return {
      nodes: res.value
        .filter((item) => !item.deleted)
        .map(toRemoteNode),
      nextPageToken: res["@odata.nextLink"],
    };
  }

  async getMetadata(remoteId: string): Promise<RemoteNode> {
    const item = await this.http.json<GraphItem>(
      `${API}/items/${encodeURIComponent(remoteId)}?$select=${ITEM_FIELDS}`,
    );
    return toRemoteNode(item);
  }

  async download(remoteId: string): Promise<ReadableStream<Uint8Array>> {
    const res = await this.http.request(
      `${API}/items/${encodeURIComponent(remoteId)}/content`,
    );
    if (!res.ok || !res.body) {
      throw await translateError(res, `download(${remoteId})`);
    }
    return res.body;
  }

  async upload(args: UploadArgs): Promise<RemoteNode> {
    const parentId = args.parentRemoteId ?? await this.getRootId();
    const url = `${API}/items/${encodeURIComponent(parentId)}:/${encodeURIComponent(args.name)}:/content`;
    const uploadInit: RequestInit & { duplex?: "half" | "full" } = {
      method: "PUT",
      headers: {
        "content-type": args.mimeType ?? "application/octet-stream",
        ...(args.size != null ? { "content-length": String(args.size) } : {}),
      },
      body: args.stream,
      duplex: "half",
    };
    const item = await this.http.json<GraphItem>(url, uploadInit);
    return toRemoteNode(item);
  }

  async createFolder(
    parentRemoteId: string | null,
    name: string,
  ): Promise<RemoteNode> {
    const url =
      parentRemoteId == null
        ? `${API}/root/children`
        : `${API}/items/${encodeURIComponent(parentRemoteId)}/children`;
    const item = await this.http.json<GraphItem>(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        folder: {},
        "@microsoft.graph.conflictBehavior": "fail",
      }),
    });
    return toRemoteNode(item);
  }

  async move(
    remoteId: string,
    newParentRemoteId: string | null,
    newName?: string,
  ): Promise<RemoteNode> {
    const parentId = newParentRemoteId ?? await this.getRootId();
    const body: Record<string, unknown> = {
      parentReference: { id: parentId },
    };
    if (newName) body.name = newName;
    const item = await this.http.json<GraphItem>(
      `${API}/items/${encodeURIComponent(remoteId)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    return toRemoteNode(item);
  }

  async copy(
    remoteId: string,
    newParentRemoteId: string | null,
    newName?: string,
  ): Promise<RemoteNode> {
    const parentId = newParentRemoteId ?? await this.getRootId();
    const body: Record<string, unknown> = {
      parentReference: { id: parentId },
    };
    if (newName) body.name = newName;

    const res = await this.http.request(
      `${API}/items/${encodeURIComponent(remoteId)}/copy`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          prefer: "respond-async",
        },
        body: JSON.stringify(body),
      },
    );

    if (res.status === 202) {
      const monitorUrl = res.headers.get("location");
      if (!monitorUrl) {
        throw new ProviderError(
          "onedrive copy returned 202 without a Location header",
          this.type,
        );
      }
      const item = await pollCopyJob(this.http, monitorUrl);
      return toRemoteNode(item);
    }

    if (res.ok) {
      const item = (await res.json()) as GraphItem;
      return toRemoteNode(item);
    }

    throw await translateError(res, `copy(${remoteId})`);
  }

  async delete(remoteId: string): Promise<void> {
    const res = await this.http.request(
      `${API}/items/${encodeURIComponent(remoteId)}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      throw await translateError(res, `delete(${remoteId})`);
    }
  }

  async getUsage(): Promise<UsageSnapshot> {
    const info = await this.http.json<DriveInfo>(
      `${API}?$select=quota`,
    );
    const q = info.quota;
    if (!q) return {};
    return {
      total: q.total,
      used: q.used,
      available: q.remaining,
    };
  }

  async *listChanges(cursor?: string): AsyncIterable<ChangeEvent> {
    if (!cursor) {
      return;
    }

    let nextUrl: string | undefined = cursor;
    while (nextUrl) {
      const res: ListResponse = await this.http.json<ListResponse>(nextUrl);
      for (const item of res.value) {
        if (item.deleted) {
          yield { kind: "delete", remoteId: item.id };
        } else {
          yield { kind: "upsert", node: toRemoteNode(item) };
        }
      }
      nextUrl = res["@odata.nextLink"] ?? res["@odata.deltaLink"];
      if (res["@odata.deltaLink"]) {
        break;
      }
    }
  }

  async seedCursor(): Promise<string> {
    let url = `${API}/root/delta?$select=${ITEM_FIELDS}`;
    while (true) {
      const res = await this.http.json<ListResponse>(url);
      const delta = res["@odata.deltaLink"];
      if (delta) return delta;
      const next = res["@odata.nextLink"];
      if (!next) {
        throw new ProviderError(
          "onedrive delta seed did not return a deltaLink",
          this.type,
        );
      }
      url = next;
    }
  }

  private async getRootId(): Promise<string> {
    if (this.rootId) return this.rootId;
    const root = await this.http.json<{ id: string }>(`${API}/root?$select=id`);
    this.rootId = root.id;
    return this.rootId;
  }
}

type CopyJobStatus = {
  status?: string;
  resourceId?: string;
  percentageComplete?: number;
  errorCode?: string;
};

async function pollCopyJob(
  http: OneDriveHttp,
  monitorUrl: string,
): Promise<GraphItem> {
  const MAX_WAIT_MS = 60_000;
  const start = Date.now();
  let delay = 500;

  while (Date.now() - start < MAX_WAIT_MS) {
    await sleep(delay);
    delay = Math.min(delay * 2, 5000);

    const res = await http.request(monitorUrl, { skipAuth: true } as RequestInit & { skipAuth?: boolean });
    if (!res.ok) {
      throw await translateError(res, `copy job monitor`);
    }

    const status = (await res.json()) as CopyJobStatus;

    if (status.status === "completed" && status.resourceId) {
      return http.json<GraphItem>(
        `https://graph.microsoft.com/v1.0/me/drive/items/${encodeURIComponent(status.resourceId)}?$select=${ITEM_FIELDS}`,
      );
    }

    if (status.status === "failed") {
      throw new ProviderError(
        `onedrive copy failed: ${status.errorCode ?? "unknown"}`,
        "onedrive",
      );
    }
  }
  throw new ProviderError(
    `onedrive copy job timed out after ${MAX_WAIT_MS}ms`,
    "onedrive",
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toRemoteNode(item: GraphItem): RemoteNode {
  const isFolder = !!item.folder;
  const parentId = item.parentReference?.id ?? null;
  const checksum =
    item.file?.hashes?.sha256Hash ?? item.file?.hashes?.sha1Hash;
  return {
    remoteId: item.id,
    name: item.name,
    type: isFolder ? "folder" : "file",
    parentRemoteId: parentId,
    size: item.size,
    mimeType: item.file?.mimeType,
    checksum,
    remoteCreatedAt: item.fileSystemInfo?.createdDateTime
      ? new Date(item.fileSystemInfo.createdDateTime)
      : undefined,
    remoteUpdatedAt: item.fileSystemInfo?.lastModifiedDateTime
      ? new Date(item.fileSystemInfo.lastModifiedDateTime)
      : undefined,
  };
}
