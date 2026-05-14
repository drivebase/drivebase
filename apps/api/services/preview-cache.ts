import { join } from "node:path";
import type { AppConfig } from "@drivebase/config";

export function previewFilePath(config: AppConfig, nodeId: string): string {
  return join(config.preview.cachePath, nodeId.slice(0, 2), `${nodeId}.jpg`);
}

export async function readPreview(
  config: AppConfig,
  nodeId: string,
): Promise<ArrayBuffer | null> {
  const f = Bun.file(previewFilePath(config, nodeId));
  if (!(await f.exists())) return null;
  return f.arrayBuffer();
}
