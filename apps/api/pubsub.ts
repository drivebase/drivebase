import { createPubSub } from "graphql-yoga";

/**
 * Progress events forwarded from workers into the API.
 *
 * Workers publish to Redis channel `operation:<id>:progress` (see
 * apps/workers/runtime/progress.ts). The `startRedisBridge` in bridge.ts
 * PSUBSCRIBEs that pattern and forwards every payload into this in-process
 * PubSub on channel `operation:<id>:progress`.
 *
 * `kind` is the discriminator — "progress" is byte-level throttled updates,
 * "status" is per-job lifecycle, "operation" is the final terminal flip.
 */
export type ProgressPayload = {
  kind: "progress";
  operationId: string;
  jobId: string;
  bytes: number;
  sizeBytes?: number;
  entryKind: string;
};

export type StatusPayload = {
  kind: "status";
  operationId: string;
  jobId: string;
  status: "running" | "succeeded" | "failed" | "skipped";
  error?: string;
};

export type OperationPayload = {
  kind: "operation";
  operationId: string;
  status: "running" | "succeeded" | "failed" | "cancelled";
};

export type ConflictPayload = {
  kind: "conflict";
  operationId: string;
  jobId: string;
  conflictId: string;
  path: string;
  existingType: string;
  incomingType: string;
};

export type OperationProgressEvent =
  | ProgressPayload
  | StatusPayload
  | OperationPayload
  | ConflictPayload;

/** Channel key helper — workers and the bridge must agree on this format. */
export function operationChannel(operationId: string): string {
  return `operation:${operationId}:progress`;
}

/**
 * Typed PubSub channel map. The key format is important: templates in
 * graphql-yoga's PubSub must be string-literal-typed so `pubsub.subscribe`
 * / `pubsub.publish` narrow correctly.
 */
export type PubSubChannels = {
  [K: `operation:${string}:progress`]: [OperationProgressEvent];
};

export const pubsub = createPubSub<PubSubChannels>();
export type AppPubSub = typeof pubsub;
