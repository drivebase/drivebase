import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assembledSize,
  chunkPath,
  ensureSessionDir,
  openAssembledStream,
  removeSession,
  sessionDir,
  writeChunk,
} from "./index.ts";

/**
 * Unit tests for the staging helpers. All I/O is scoped to an ephemeral
 * tmpdir per test, so these are hermetic and quick — no containers.
 */

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "staging-unit-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true }).catch(() => {});
});

function streamOf(bytes: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(c) {
      for (const b of bytes) c.enqueue(b);
      c.close();
    },
  });
}

async function drain(s: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  const reader = s.getReader();
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

describe("path helpers", () => {
  test("sessionDir + chunkPath build the documented layout", () => {
    expect(sessionDir("/tmp/x", "s1")).toBe("/tmp/x/s1");
    expect(chunkPath("/tmp/x", "s1", 0)).toBe("/tmp/x/s1/0.part");
    expect(chunkPath("/tmp/x", "s1", 42)).toBe("/tmp/x/s1/42.part");
  });

  test("ensureSessionDir is idempotent and creates nested dirs", async () => {
    const d1 = await ensureSessionDir(root, "sess");
    const d2 = await ensureSessionDir(root, "sess");
    expect(d1).toBe(d2);
    const st = await stat(d1);
    expect(st.isDirectory()).toBe(true);
  });
});

describe("writeChunk", () => {
  test("writes stream bytes to <root>/<session>/<index>.part and reports size", async () => {
    const body = new Uint8Array([1, 2, 3, 4, 5]);
    const res = await writeChunk({
      stagingDir: root,
      sessionId: "s",
      index: 0,
      stream: streamOf([body]),
    });
    expect(res.size).toBe(5);
    expect(res.path).toBe(chunkPath(root, "s", 0));
    const disk = await readFile(res.path);
    expect(new Uint8Array(disk)).toEqual(body);
  });

  test("concatenates multi-chunk stream into one file", async () => {
    const res = await writeChunk({
      stagingDir: root,
      sessionId: "s",
      index: 1,
      stream: streamOf([new Uint8Array([1, 2]), new Uint8Array([3, 4, 5])]),
    });
    expect(res.size).toBe(5);
    const disk = await readFile(res.path);
    expect(new Uint8Array(disk)).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
  });

  test("overwrites existing chunk (last-writer-wins retry)", async () => {
    await writeChunk({
      stagingDir: root,
      sessionId: "s",
      index: 0,
      stream: streamOf([new Uint8Array([9, 9, 9, 9])]),
    });
    const res = await writeChunk({
      stagingDir: root,
      sessionId: "s",
      index: 0,
      stream: streamOf([new Uint8Array([1, 2])]),
    });
    expect(res.size).toBe(2);
    const disk = await readFile(chunkPath(root, "s", 0));
    expect(new Uint8Array(disk)).toEqual(new Uint8Array([1, 2]));
  });

  test("removes the partial file if the stream errors mid-write", async () => {
    const errored = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([1, 2]));
        c.error(new Error("boom"));
      },
    });
    await expect(
      writeChunk({
        stagingDir: root,
        sessionId: "s",
        index: 0,
        stream: errored,
      }),
    ).rejects.toThrow(/boom/);
    const disk = await stat(chunkPath(root, "s", 0)).catch(() => null);
    expect(disk).toBeNull();
  });
});

describe("openAssembledStream", () => {
  test("concatenates chunks 0..N-1 in order", async () => {
    const sessionId = "asm1";
    await ensureSessionDir(root, sessionId);
    await writeFile(chunkPath(root, sessionId, 0), new Uint8Array([1, 2]));
    await writeFile(chunkPath(root, sessionId, 1), new Uint8Array([3, 4, 5]));
    await writeFile(chunkPath(root, sessionId, 2), new Uint8Array([6]));

    const merged = await drain(
      openAssembledStream({ stagingDir: root, sessionId, totalChunks: 3 }),
    );
    expect(merged).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]));
  });

  test("closes cleanly on totalChunks=0", async () => {
    const merged = await drain(
      openAssembledStream({ stagingDir: root, sessionId: "empty", totalChunks: 0 }),
    );
    expect(merged.byteLength).toBe(0);
  });

  test("skips zero-byte chunks without stalling", async () => {
    const sessionId = "zeros";
    await ensureSessionDir(root, sessionId);
    await writeFile(chunkPath(root, sessionId, 0), new Uint8Array([]));
    await writeFile(chunkPath(root, sessionId, 1), new Uint8Array([7, 7]));
    await writeFile(chunkPath(root, sessionId, 2), new Uint8Array([]));

    const merged = await drain(
      openAssembledStream({ stagingDir: root, sessionId, totalChunks: 3 }),
    );
    expect(merged).toEqual(new Uint8Array([7, 7]));
  });

  test("rejects when a chunk file is missing", async () => {
    const sessionId = "gap";
    await ensureSessionDir(root, sessionId);
    await writeFile(chunkPath(root, sessionId, 0), new Uint8Array([1]));
    // index 1 missing
    await expect(
      drain(openAssembledStream({ stagingDir: root, sessionId, totalChunks: 2 })),
    ).rejects.toBeTruthy();
  });
});

describe("assembledSize", () => {
  test("sums sizes of every chunk file", async () => {
    const sessionId = "sz";
    await ensureSessionDir(root, sessionId);
    await writeFile(chunkPath(root, sessionId, 0), new Uint8Array(3));
    await writeFile(chunkPath(root, sessionId, 1), new Uint8Array(5));
    const n = await assembledSize({
      stagingDir: root,
      sessionId,
      totalChunks: 2,
    });
    expect(n).toBe(8);
  });

  test("throws if any chunk is missing", async () => {
    const sessionId = "sz2";
    await ensureSessionDir(root, sessionId);
    await writeFile(chunkPath(root, sessionId, 0), new Uint8Array(3));
    await expect(
      assembledSize({ stagingDir: root, sessionId, totalChunks: 2 }),
    ).rejects.toBeTruthy();
  });
});

describe("removeSession", () => {
  test("removes the whole session directory recursively", async () => {
    const sessionId = "kill";
    await ensureSessionDir(root, sessionId);
    await writeFile(chunkPath(root, sessionId, 0), new Uint8Array([1]));
    await writeFile(chunkPath(root, sessionId, 1), new Uint8Array([2]));
    await removeSession({ stagingDir: root, sessionId });
    const st = await stat(sessionDir(root, sessionId)).catch(() => null);
    expect(st).toBeNull();
  });

  test("no-op on a session that never existed", async () => {
    await removeSession({ stagingDir: root, sessionId: "ghost" });
    // No throw is the assertion.
    expect(true).toBe(true);
  });
});
