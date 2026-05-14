import { Worker } from "bullmq";
import sharp from "sharp";
import type { Redis } from "ioredis";
import type { Db } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";
import type { Logger } from "@drivebase/logger";
import type { ProviderRegistry } from "@drivebase/storage";
import { getProvider } from "../runtime/providers.ts";
import { writePreview } from "../services/preview-cache-writer.ts";

export type PreviewJobData = {
  nodeId: string;
  userId: string;
  remoteId: string;
  providerId: string;
  mimeType: string | null;
};

export type PreviewWorkerDeps = {
  db: Db;
  config: AppConfig;
  registry: ProviderRegistry;
  log: Logger;
  primary: Redis;
  pub: Redis;
};

export function startPreviewWorker(deps: PreviewWorkerDeps): Worker<PreviewJobData> {
  const concurrency = deps.config.workers.concurrency.previewGenerate;

  deps.log.info({ concurrency }, "preview worker starting");

  const worker = new Worker<PreviewJobData>(
    "previewGenerate",
    async (job) => {
      const { nodeId, remoteId, providerId, mimeType } = job.data;

      deps.log.info({ nodeId, providerId }, "preview: generating thumbnail");

      const provider = await getProvider({
        db: deps.db,
        config: deps.config,
        registry: deps.registry,
        providerId,
      });

      let stream: ReadableStream<Uint8Array>;
      try {
        stream = await provider.download(remoteId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        deps.log.error({ err: message, nodeId, providerId }, "preview: download failed");
        throw err;
      }

      const chunks: Uint8Array[] = [];
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      const raw = Buffer.concat(chunks);

      const jpeg = await sharp(raw)
        .rotate()
        .resize(deps.config.preview.maxEdgePx, deps.config.preview.maxEdgePx, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      await writePreview(deps.config, nodeId, jpeg);

      await deps.pub.publish(
        `preview:${nodeId}:ready`,
        JSON.stringify({ nodeId }),
      );

      deps.log.info(
        { nodeId, mimeType, inputBytes: raw.byteLength, outputBytes: jpeg.byteLength },
        "preview: thumbnail ready",
      );
    },
    { connection: deps.primary, concurrency },
  );

  worker.on("failed", (job, err) => {
    const message = err instanceof Error ? err.message : String(err);
    deps.log.error(
      { nodeId: job?.data.nodeId, err: message },
      "preview: job failed after all retries",
    );
  });

  worker.on("error", (err) => {
    deps.log.error({ err }, "preview: bullmq worker error");
  });

  return worker;
}
