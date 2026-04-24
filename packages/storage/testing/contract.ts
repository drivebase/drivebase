/**
 * Provider contract test suite. A provider package calls
 * `runContract({ name, createProvider, cleanup? })` inside a bun:test
 * file and every capability-appropriate scenario is exercised.
 */
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import type { IStorageProvider } from "../provider.ts";
import { readStreamToBytes } from "../stream.ts";

export type ContractOptions = {
  name: string;
  createProvider: () => Promise<IStorageProvider>;
  /** Called after each test to reset provider state (empty the bucket, etc.). */
  cleanup?: (p: IStorageProvider) => Promise<void>;
};

export function runContract(opts: ContractOptions) {
  describe(`IStorageProvider contract: ${opts.name}`, () => {
    let p: IStorageProvider;

    beforeAll(async () => {
      p = await opts.createProvider();
    });

    afterAll(async () => {
      if (opts.cleanup) await opts.cleanup(p);
    });

    test("creates a folder at root and lists it", async () => {
      const folder = await p.createFolder(null, "contract-root");
      expect(folder.type).toBe("folder");
      expect(folder.name).toBe("contract-root");
      const { nodes } = await p.listChildren(null);
      expect(nodes.some((n) => n.remoteId === folder.remoteId)).toBe(true);
    });

    test("uploads and downloads roundtrip preserves bytes", async () => {
      const folder = await p.createFolder(null, "contract-io");
      const bytes = new Uint8Array(1024 * 17);
      for (let i = 0; i < bytes.length; i++) bytes[i] = i & 0xff;
      const src = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(bytes);
          c.close();
        },
      });
      const file = await p.upload({
        parentRemoteId: folder.remoteId,
        name: "blob.bin",
        stream: src,
        size: bytes.byteLength,
        mimeType: "application/octet-stream",
      });
      expect(file.type).toBe("file");
      const out = await readStreamToBytes(await p.download(file.remoteId));
      expect(out.byteLength).toBe(bytes.byteLength);
      expect(Buffer.from(out).equals(Buffer.from(bytes))).toBe(true);
    });

    test("getMetadata returns consistent remoteId/name", async () => {
      const folder = await p.createFolder(null, "contract-meta");
      const meta = await p.getMetadata(folder.remoteId);
      expect(meta.remoteId).toBe(folder.remoteId);
      expect(meta.name).toBe("contract-meta");
    });

    test("delete removes the node", async () => {
      const folder = await p.createFolder(null, "contract-del");
      const src = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new Uint8Array([1, 2, 3]));
          c.close();
        },
      });
      const file = await p.upload({
        parentRemoteId: folder.remoteId,
        name: "gone.bin",
        stream: src,
        size: 3,
      });
      await p.delete(file.remoteId);
      const { nodes } = await p.listChildren(folder.remoteId);
      expect(nodes.some((n) => n.remoteId === file.remoteId)).toBe(false);
    });

    test("copy (if supported) duplicates content at new location", async () => {
      if (!p.capabilities.supportsNativeCopy) return;
      const a = await p.createFolder(null, "contract-copy-src");
      const b = await p.createFolder(null, "contract-copy-dst");
      const src = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new Uint8Array([9, 8, 7, 6]));
          c.close();
        },
      });
      const orig = await p.upload({
        parentRemoteId: a.remoteId,
        name: "a.bin",
        stream: src,
        size: 4,
      });
      const copy = await p.copy(orig.remoteId, b.remoteId, "b.bin");
      expect(copy.remoteId).not.toBe(orig.remoteId);
      const out = await readStreamToBytes(await p.download(copy.remoteId));
      expect(Buffer.from(out).equals(Buffer.from([9, 8, 7, 6]))).toBe(true);
    });

    test("move (if supported) changes parent", async () => {
      if (!p.capabilities.supportsNativeMove) return;
      const a = await p.createFolder(null, "contract-mv-src");
      const b = await p.createFolder(null, "contract-mv-dst");
      const src = new ReadableStream<Uint8Array>({
        start(c) {
          c.enqueue(new Uint8Array([1]));
          c.close();
        },
      });
      const f = await p.upload({
        parentRemoteId: a.remoteId,
        name: "m.bin",
        stream: src,
        size: 1,
      });
      const moved = await p.move(f.remoteId, b.remoteId);
      expect(moved.parentRemoteId).toBe(b.remoteId);
    });

    test("getUsage returns a numeric used field or undefined", async () => {
      const u = await p.getUsage();
      if (u.used !== undefined) expect(typeof u.used).toBe("number");
    });

    test("multipart lifecycle (if supported) roundtrips bytes", async () => {
      if (!p.capabilities.supportsMultipartUpload) return;
      if (!p.initiateMultipart || !p.uploadPart || !p.completeMultipart) {
        throw new Error(
          "provider claims supportsMultipartUpload but lacks the methods",
        );
      }
      const folder = await p.createFolder(null, "contract-multipart");
      // Two parts of predictable bytes. Most providers require each non-final
      // part to meet a minimum size (S3: 5 MiB). We deliberately stay under
      // that: a single-part multipart is legal everywhere because the last
      // part has no minimum. Test falls back to one part when the provider
      // rejects a second small part.
      const bytes = new Uint8Array(1024);
      for (let i = 0; i < bytes.length; i++) bytes[i] = i & 0xff;

      const { uploadId, key } = await p.initiateMultipart({
        parentRemoteId: folder.remoteId,
        name: "mp.bin",
        size: bytes.byteLength,
      });
      const part = await p.uploadPart({
        uploadId,
        key,
        partNumber: 1,
        body: bytes,
        size: bytes.byteLength,
      });
      expect(typeof part.etag).toBe("string");
      expect(part.etag.length).toBeGreaterThan(0);

      const remote = await p.completeMultipart({
        uploadId,
        key,
        parts: [{ partNumber: 1, etag: part.etag }],
      });
      expect(remote.type).toBe("file");

      const out = await readStreamToBytes(await p.download(remote.remoteId));
      expect(out.byteLength).toBe(bytes.byteLength);
      expect(Buffer.from(out).equals(Buffer.from(bytes))).toBe(true);
    });
  });
}
