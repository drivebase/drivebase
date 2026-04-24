import type { Redis } from "ioredis";

/**
 * Progress event shape. The Phase 7 realtime bridge PSUBSCRIBEs
 * `operation:*:progress` and forwards the JSON payload to the Yoga PubSub
 * channel `operationProgress:<operationId>`.
 */
export type ProgressEvent =
  | {
      kind: "progress";
      operationId: string;
      jobId: string;
      bytes: number;
      sizeBytes?: number;
      entryKind: string;
    }
  | {
      kind: "status";
      operationId: string;
      jobId: string;
      status: "running" | "succeeded" | "failed" | "skipped";
      error?: string;
    }
  | {
      kind: "operation";
      operationId: string;
      status: "running" | "succeeded" | "failed" | "cancelled";
    }
  | {
      kind: "conflict";
      operationId: string;
      jobId: string;
      conflictId: string;
      path: string;
      existingType: string;
      incomingType: string;
    };

export function channelFor(operationId: string): string {
  return `operation:${operationId}:progress`;
}

export async function publishProgress(
  pub: Redis,
  event: ProgressEvent,
): Promise<void> {
  await pub.publish(channelFor(event.operationId), JSON.stringify(event));
}
