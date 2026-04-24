import {
  copyFile,
  mkdir,
  readdir,
  rename,
  rm,
  stat,
} from "node:fs/promises";
import { join, relative, basename } from "node:path";
import { NotFoundError, ProviderError } from "@drivebase/storage";
import type {
  AuthContext,
  IStorageProvider,
  ListChildrenResult,
  ProviderCapabilities,
  ProviderCredentials,
  RemoteNode,
  UploadArgs,
  UsageSnapshot,
} from "@drivebase/storage";

/**
 * Local filesystem provider. `remoteId` is a path relative to `rootDir`
 * (e.g. `photos/image.jpg`, never starts with `/`). Root listing uses
 * `remoteId = null` which maps to the root dir itself.
 *
 * Designed for dev/testing — no credentials required, just a root directory.
 */
export class LocalProvider implements IStorageProvider {
  readonly type = "local";
  readonly capabilities: ProviderCapabilities = {
    isHierarchical: true,
    supportsNativeCopy: true,
    supportsNativeMove: true,
    supportsDelta: false,
    supportsChecksum: false,
    supportsMultipartUpload: false,
    supportsPresignedUploadParts: false,
  };

  constructor(private readonly rootDir: string) {}

  async authenticate(_creds: ProviderCredentials): Promise<AuthContext> {
    await mkdir(this.rootDir, { recursive: true });
    return { accountLabel: this.rootDir };
  }

  async listChildren(parentRemoteId: string | null): Promise<ListChildrenResult> {
    const dir = this.abs(parentRemoteId);
    let entries: string[];
    try {
      const dirents = await readdir(dir);
      entries = dirents;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        throw new NotFoundError(`local: directory not found: ${dir}`);
      }
      throw new ProviderError(`local: readdir failed: ${String(err)}`, "local");
    }

    const nodes: RemoteNode[] = [];
    for (const name of entries) {
      if (name.startsWith(".")) continue;
      const abs = join(dir, name);
      const s = await stat(abs).catch(() => null);
      if (!s) continue;
      const relId = relative(this.rootDir, abs);
      nodes.push({
        remoteId: relId,
        name,
        type: s.isDirectory() ? "folder" : "file",
        parentRemoteId,
        size: s.isFile() ? s.size : undefined,
        remoteCreatedAt: s.birthtime,
        remoteUpdatedAt: s.mtime,
      });
    }
    return { nodes };
  }

  async getMetadata(remoteId: string): Promise<RemoteNode> {
    const abs = this.abs(remoteId);
    let s: Awaited<ReturnType<typeof stat>>;
    try {
      s = await stat(abs);
    } catch {
      throw new NotFoundError(`local: not found: ${remoteId}`);
    }
    const name = basename(abs);
    const parentAbs = join(abs, "..");
    const parentId = parentAbs === this.rootDir
      ? null
      : relative(this.rootDir, parentAbs);
    return {
      remoteId,
      name,
      type: s.isDirectory() ? "folder" : "file",
      parentRemoteId: parentId,
      size: s.isFile() ? s.size : undefined,
      remoteCreatedAt: s.birthtime,
      remoteUpdatedAt: s.mtime,
    };
  }

  async download(remoteId: string): Promise<ReadableStream<Uint8Array>> {
    const abs = this.abs(remoteId);
    const file = Bun.file(abs);
    if (!(await file.exists())) throw new NotFoundError(`local: not found: ${remoteId}`);
    return file.stream() as ReadableStream<Uint8Array>;
  }

  async upload(args: UploadArgs): Promise<RemoteNode> {
    const parentDir = this.abs(args.parentRemoteId ?? null);
    await mkdir(parentDir, { recursive: true });
    const abs = join(parentDir, args.name);
    // Delete existing file if present (overwrite semantics)
    await rm(abs, { recursive: true, force: true }).catch(() => {});
    const writer = Bun.file(abs).writer();
    const reader = args.stream.getReader();
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        writer.write(value);
        size += value.byteLength;
      }
      await writer.end();
    } finally {
      reader.releaseLock();
    }
    const relId = relative(this.rootDir, abs);
    return {
      remoteId: relId,
      name: args.name,
      type: "file",
      parentRemoteId: args.parentRemoteId ?? null,
      size,
    };
  }

  async createFolder(parentRemoteId: string | null, name: string): Promise<RemoteNode> {
    const parentDir = this.abs(parentRemoteId);
    const abs = join(parentDir, name);
    await mkdir(abs, { recursive: true });
    const relId = relative(this.rootDir, abs);
    return { remoteId: relId, name, type: "folder", parentRemoteId };
  }

  async move(
    remoteId: string,
    newParentRemoteId: string | null,
    newName?: string,
  ): Promise<RemoteNode> {
    const src = this.abs(remoteId);
    const name = newName ?? basename(src);
    const dstDir = this.abs(newParentRemoteId);
    await mkdir(dstDir, { recursive: true });
    const dst = join(dstDir, name);

    // If source and destination are the same, nothing to do
    if (src === dst) {
      const s = await stat(src);
      return {
        remoteId,
        name,
        type: s.isDirectory() ? "folder" : "file",
        parentRemoteId: newParentRemoteId,
        size: s.isFile() ? s.size : undefined,
      };
    }

    // Delete destination if it exists (overwrite semantics)
    await rm(dst, { recursive: true, force: true }).catch(() => {});
    await rename(src, dst);
    const relId = relative(this.rootDir, dst);
    const s = await stat(dst);
    return {
      remoteId: relId,
      name,
      type: s.isDirectory() ? "folder" : "file",
      parentRemoteId: newParentRemoteId,
      size: s.isFile() ? s.size : undefined,
    };
  }

  async copy(
    remoteId: string,
    newParentRemoteId: string | null,
    newName?: string,
  ): Promise<RemoteNode> {
    const src = this.abs(remoteId);
    const name = newName ?? basename(src);
    const dstDir = this.abs(newParentRemoteId);
    await mkdir(dstDir, { recursive: true });
    const dst = join(dstDir, name);
    // copyFile with COPYFILE_FICLONE (fallback if not supported)
    // Note: Bun's copyFile doesn't take flags, so we delete first for overwrite
    await rm(dst, { recursive: true, force: true }).catch(() => {});
    await copyFile(src, dst);
    const s = await stat(dst);
    const relId = relative(this.rootDir, dst);
    return {
      remoteId: relId,
      name,
      type: s.isFile() ? "file" : "folder",
      parentRemoteId: newParentRemoteId,
      size: s.isFile() ? s.size : undefined,
    };
  }

  async delete(remoteId: string): Promise<void> {
    const abs = this.abs(remoteId);
    await rm(abs, { recursive: true, force: true });
  }

  async getUsage(): Promise<UsageSnapshot> {
    const used = await du(this.rootDir);
    return { used };
  }

  private abs(remoteId: string | null): string {
    if (!remoteId) return this.rootDir;
    const resolved = join(this.rootDir, remoteId);
    if (!resolved.startsWith(this.rootDir + "/") && resolved !== this.rootDir) {
      throw new ProviderError(`local: path traversal rejected: ${remoteId}`, "local");
    }
    return resolved;
  }
}

async function du(dir: string): Promise<number> {
  let total = 0;
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return 0;
  }
  for (const name of entries) {
    const abs = join(dir, name);
    const s = await stat(abs).catch(() => null);
    if (!s) continue;
    if (s.isDirectory()) {
      total += await du(abs);
    } else {
      total += s.size;
    }
  }
  return total;
}
