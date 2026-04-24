import { Queue } from "bullmq";
import type { Redis } from "ioredis";
import type { QueueName } from "@drivebase/storage";

/**
 * Lazy queue cache for the worker process. Workers need to enqueue child jobs
 * (e.g. after createFolder materializes a folder) without going through the
 * API. Reuses the existing primary Redis connection.
 */
export function makeQueueFactory(primary: Redis): (name: QueueName) => Promise<Queue> {
  const cache = new Map<QueueName, Queue>();
  return async (name: QueueName): Promise<Queue> => {
    const hit = cache.get(name);
    if (hit) return hit;
    const q = new Queue(name, {
      connection: primary,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    });
    cache.set(name, q);
    return q;
  };
}
