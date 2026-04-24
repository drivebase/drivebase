import type { Logger } from "@drivebase/logger";
import type { Redis } from "ioredis";
import {
  pubsub,
  type OperationProgressEvent,
} from "./pubsub.ts";

/**
 * Bridge Redis `operation:*:progress` → in-process Yoga PubSub.
 *
 * Workers live in another process and can't share the in-memory PubSub.
 * They PUBLISH JSON payloads to a Redis channel; we PSUBSCRIBE here and
 * re-emit onto the same channel name inside this process so subscription
 * resolvers can just read from `pubsub`.
 *
 * The pattern `operation:*:progress` matches any operationId. We could
 * scope the subscription per-operation (one SUBSCRIBE per active viewer),
 * but a single PSUBSCRIBE with in-process filtering is simpler and uses
 * one Redis connection regardless of viewer count.
 */
export type RedisBridgeHandle = {
  stop: () => Promise<void>;
};

export async function startRedisBridge(args: {
  sub: Redis;
  log: Logger;
}): Promise<RedisBridgeHandle> {
  const { sub, log } = args;

  // ioredis `pmessage` fires with (pattern, channel, message). The channel
  // is what we re-publish into the in-process PubSub.
  sub.on("pmessage", (_pattern: string, channel: string, message: string) => {
    try {
      const event = JSON.parse(message) as OperationProgressEvent;
      pubsub.publish(channel as `operation:${string}:progress`, event);
    } catch (err) {
      log.warn({ err, channel }, "redis bridge: bad payload");
    }
  });

  await sub.psubscribe("operation:*:progress");
  log.info({ pattern: "operation:*:progress" }, "redis → pubsub bridge online");

  return {
    stop: async () => {
      await sub.punsubscribe("operation:*:progress");
    },
  };
}
