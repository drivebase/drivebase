import type { PlanEntry } from "./types.ts";

/**
 * BullMQ queue names. API (producer) and workers (consumer) both import
 * these so the strings never drift.
 */
export const QUEUE_NAMES = [
  "upload",
  "download",
  "transfer",
  "copy",
  "move",
  "delete",
  "createFolder",
  "syncReconcile",
  "usageRefresh",
] as const;

export type QueueName = (typeof QUEUE_NAMES)[number];

/** Map a plan entry's kind onto the BullMQ queue that processes it. */
export function queueForEntry(entry: PlanEntry): QueueName {
  switch (entry.kind) {
    case "upload":
      return "upload";
    case "transfer":
      return "transfer";
    case "copy":
      return "copy";
    case "move":
      return "move";
    case "delete":
      return "delete";
    case "createFolder":
      return "createFolder";
  }
}
