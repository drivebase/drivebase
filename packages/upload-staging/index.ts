import { mkdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * Staging directory layout for chunked uploads.
 *
 *   <stagingDir>/<sessionId>/<index>.part
 *
 * The staging dir is the disk-backed buffer between the API's chunk REST
 * endpoint and the worker that finalises the upload. Chunks are written
 * as the client streams them, then the worker concatenates them in order
 * into the provider's `upload()` call. For direct-S3 sessions this layout
 * is unused — the browser PUTs straight at S3 via presigned URLs.
 *
 * Both the API (writer) and the workers (reader + cleanup) depend on the
 * exact same path layout, which is why this lives in its own shared
 * package instead of inside one app.
 */

export function sessionDir(stagingDir: string, sessionId: string): string {
  return join(stagingDir, sessionId);
}

export function chunkPath(
  stagingDir: string,
  sessionId: string,
  index: number,
): string {
  return join(sessionDir(stagingDir, sessionId), `${index}.part`);
}

export async function ensureSessionDir(
  stagingDir: string,
  sessionId: string,
): Promise<string> {
  const dir = sessionDir(stagingDir, sessionId);
  await mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Write a single chunk from a web ReadableStream to disk. Returns the number
 * of bytes actually written so the caller can persist it on the
 * `upload_chunks` row.
 */
export async function writeChunk(args: {
  stagingDir: string;
  sessionId: string;
  index: number;
  stream: ReadableStream<Uint8Array>;
}): Promise<{ path: string; size: number }> {
  await ensureSessionDir(args.stagingDir, args.sessionId);
  const path = chunkPath(args.stagingDir, args.sessionId, args.index);

  // Remove any prior artifact at this path so a shorter retry can't leave
  // trailing bytes from the previous write. Bun's file writer opens with
  // O_WRONLY (no O_TRUNC), which would otherwise corrupt the chunk.
  await rm(path, { force: true });
  const file = Bun.file(path);
  const writer = file.writer();
  let size = 0;
  const reader = args.stream.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (!value) continue;
      writer.write(value);
      size += value.byteLength;
    }
    await writer.end();
  } catch (err) {
    try {
      await writer.end();
    } catch {
      // best-effort cleanup
    }
    await rm(path, { force: true }).catch(() => {});
    throw err;
  }
  return { path, size };
}

/**
 * Build a single `ReadableStream` that concatenates all chunks 0..totalChunks-1
 * in order. Used by the worker to feed `IStorageProvider.upload`. Throws if
 * a chunk is missing on disk (Bun surfaces an ENOENT once the reader is
 * pulled).
 */
export function openAssembledStream(args: {
  stagingDir: string;
  sessionId: string;
  totalChunks: number;
}): ReadableStream<Uint8Array> {
  const { stagingDir, sessionId, totalChunks } = args;
  let current = 0;
  let currentReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (true) {
        if (!currentReader) {
          if (current >= totalChunks) {
            controller.close();
            return;
          }
          const path = chunkPath(stagingDir, sessionId, current);
          current += 1;
          currentReader = Bun.file(path).stream().getReader() as ReadableStreamDefaultReader<Uint8Array>;
        }

        const { done, value } = await currentReader.read();
        if (done) {
          currentReader.releaseLock();
          currentReader = null;
          continue;
        }
        if (!value || value.byteLength === 0) continue;
        controller.enqueue(value);
        return;
      }
    },
    async cancel(reason) {
      if (currentReader) {
        await currentReader.cancel(reason);
        currentReader.releaseLock();
        currentReader = null;
      }
    },
  });
}

/** Total size on disk for a session's chunks. Useful for sanity checks. */
export async function assembledSize(args: {
  stagingDir: string;
  sessionId: string;
  totalChunks: number;
}): Promise<number> {
  let total = 0;
  for (let i = 0; i < args.totalChunks; i += 1) {
    const s = await stat(chunkPath(args.stagingDir, args.sessionId, i));
    total += s.size;
  }
  return total;
}

/** Remove all staged chunks for a session. Safe to call even if nothing exists. */
export async function removeSession(args: {
  stagingDir: string;
  sessionId: string;
}): Promise<void> {
  await rm(sessionDir(args.stagingDir, args.sessionId), {
    recursive: true,
    force: true,
  });
}
