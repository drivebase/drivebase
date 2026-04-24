/**
 * Wrap a ReadableStream, invoking `onProgress(transferredBytes)` at most
 * once per `minIntervalMs` (or every `chunkThreshold` bytes, whichever
 * comes first). Used by the transfer worker to emit throttled progress
 * to Redis without swamping the channel.
 */
export function meterStream<T extends Uint8Array>(
  source: ReadableStream<T>,
  onProgress: (bytes: number) => void,
  opts: { minIntervalMs?: number; chunkThreshold?: number } = {},
): ReadableStream<T> {
  const minIntervalMs = opts.minIntervalMs ?? 500;
  const chunkThreshold = opts.chunkThreshold ?? 256 * 1024;
  let total = 0;
  let sinceTick = 0;
  let lastEmit = 0;

  const reader = source.getReader();
  return new ReadableStream<T>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        onProgress(total);
        controller.close();
        return;
      }
      total += value.byteLength;
      sinceTick += value.byteLength;
      const now = Date.now();
      if (sinceTick >= chunkThreshold || now - lastEmit >= minIntervalMs) {
        lastEmit = now;
        sinceTick = 0;
        onProgress(total);
      }
      controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
}

/** Drain a ReadableStream into a single Uint8Array (small payloads only). */
export async function readStreamToBytes(
  source: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
  const reader = source.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

/** Hash a stream while passing it through. Returns the hex digest promise. */
export function sha256PassThrough(
  source: ReadableStream<Uint8Array>,
): { stream: ReadableStream<Uint8Array>; digest: Promise<string> } {
  const hasher = new Bun.CryptoHasher("sha256");
  let resolveDigest!: (v: string) => void;
  const digest = new Promise<string>((r) => (resolveDigest = r));
  const reader = source.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        resolveDigest(hasher.digest("hex"));
        controller.close();
        return;
      }
      hasher.update(value);
      controller.enqueue(value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  return { stream, digest };
}
