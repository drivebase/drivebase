import type { Worker } from "bullmq";
import type { WorkerDeps } from "./runtime/deps.ts";
import type { JobData } from "./runtime/handler.ts";
import { createWorker } from "./runtime/handler.ts";
import { handleCreateFolder } from "./handlers/create-folder.ts";
import { handleUpload } from "./handlers/upload.ts";
import { handleTransfer } from "./handlers/transfer.ts";
import { handleCopy } from "./handlers/copy.ts";
import { handleMove } from "./handlers/move.ts";
import { handleDelete } from "./handlers/delete.ts";

/**
 * Spin up every BullMQ Worker this process runs. Returns them so `index.ts`
 * can orchestrate shutdown.
 *
 * Concurrency is per-queue, pulled from config.workers.concurrency. A busy
 * transfer queue (lots of in-flight streams) wants ~4; syncReconcile wants 1.
 */
export function startWorkers(deps: WorkerDeps): Worker<JobData>[] {
  const c = deps.config.workers.concurrency;
  return [
    createWorker(deps, "createFolder", c.upload, handleCreateFolder),
    createWorker(deps, "upload", c.upload, handleUpload),
    createWorker(deps, "transfer", c.transfer, handleTransfer),
    createWorker(deps, "copy", c.copy, handleCopy),
    createWorker(deps, "move", c.move, handleMove),
    createWorker(deps, "delete", c.delete, handleDelete),
  ];
}
