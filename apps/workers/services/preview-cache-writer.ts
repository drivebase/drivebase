import { join } from "node:path";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import type { AppConfig } from "@drivebase/config";

type IndexEntry = { size: number; lastAccessedAt: number };
type Index = Record<string, IndexEntry>;

let indexLock = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = indexLock.then(fn);
  indexLock = next.then(
    () => {},
    () => {},
  );
  return next;
}

function previewFilePath(config: AppConfig, nodeId: string): string {
  return join(config.preview.cachePath, nodeId.slice(0, 2), `${nodeId}.jpg`);
}

function indexPath(config: AppConfig): string {
  return join(config.preview.cachePath, "index.json");
}

async function readIndex(config: AppConfig): Promise<Index> {
  try {
    const raw = await readFile(indexPath(config), "utf8");
    return JSON.parse(raw) as Index;
  } catch {
    return {};
  }
}

async function writeIndex(config: AppConfig, index: Index): Promise<void> {
  const tmp = `${indexPath(config)}.tmp`;
  await writeFile(tmp, JSON.stringify(index));
  await rename(tmp, indexPath(config));
}

export async function writePreview(
  config: AppConfig,
  nodeId: string,
  jpeg: Buffer,
): Promise<void> {
  const filePath = previewFilePath(config, nodeId);
  await mkdir(join(config.preview.cachePath, nodeId.slice(0, 2)), {
    recursive: true,
  });
  await writeFile(filePath, jpeg);

  await withLock(async () => {
    const index = await readIndex(config);
    index[nodeId] = { size: jpeg.byteLength, lastAccessedAt: Date.now() };

    let totalBytes = Object.values(index).reduce((s, e) => s + e.size, 0);

    if (totalBytes > config.preview.maxCacheSizeBytes) {
      const sorted = Object.entries(index).sort(
        ([, a], [, b]) => a.lastAccessedAt - b.lastAccessedAt,
      );
      for (const [evictId, entry] of sorted) {
        if (totalBytes <= config.preview.maxCacheSizeBytes) break;
        await unlink(previewFilePath(config, evictId)).catch(() => {});
        delete index[evictId];
        totalBytes -= entry.size;
      }
    }

    await writeIndex(config, index);
  });
}
