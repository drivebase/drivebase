import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Redis } from "ioredis";
import { createLogger } from "@drivebase/logger";
import {
  connectRedis,
  startPostgres,
  startRedis,
  type PostgresHarness,
  type RedisHarness,
} from "@drivebase/testing";
import { startRedisBridge } from "./bridge.ts";
import {
  operationChannel,
  pubsub,
  type OperationProgressEvent,
} from "./pubsub.ts";

/**
 * End-to-end: a worker-style publisher PUBLISHes to
 * `operation:<id>:progress`; the bridge forwards it into the in-process
 * PubSub; we assert the subscription sees the same payload. No GraphQL
 * layer here — that's exercised by a downstream test.
 */

let pg: PostgresHarness;
let redis: RedisHarness;
let pub: Redis;
let sub: Redis;
let bridgeStop: () => Promise<void>;

beforeAll(async () => {
  // Postgres isn't strictly required for bridge, but startRedis + the other
  // fixtures share the same containers pattern — cheaper to reuse the
  // testcontainers harness than hand-roll a Redis-only one.
  [pg, redis] = await Promise.all([startPostgres(), startRedis()]);
  // `connectRedis` waits for `ready` and installs an `error` listener so
  // the startup-race reconnect doesn't emit "Unhandled error event".
  [pub, sub] = await Promise.all([
    connectRedis(redis.url),
    connectRedis(redis.url),
  ]);
  const log = createLogger({
    env: "prod",
    level: "warn",
    base: { app: "bridge-test" },
  });
  const { stop } = await startRedisBridge({ sub, log });
  bridgeStop = stop;
}, 180_000);

afterAll(async () => {
  await bridgeStop?.();
  await pub?.quit().catch(() => {});
  await sub?.quit().catch(() => {});
  await Promise.allSettled([pg?.stop(), redis?.stop()]);
}, 60_000);

describe("redis → pubsub bridge", () => {
  test("forwards a progress event verbatim into the in-process PubSub", async () => {
    const operationId = "op-bridge-1";
    const channel = operationChannel(operationId);

    const received: OperationProgressEvent[] = [];
    const iter = pubsub.subscribe(
      channel as `operation:${string}:progress`,
    );

    // Consume in the background; stop after 2 events or timeout.
    const done = (async () => {
      for await (const ev of iter as AsyncIterable<OperationProgressEvent>) {
        received.push(ev);
        if (received.length >= 2) break;
      }
    })();

    // Give ioredis's pattern subscription a tick to install on the server
    // before we publish. Without this the first PUBLISH can land before
    // PSUBSCRIBE is active and gets dropped.
    await Bun.sleep(50);

    const progressPayload: OperationProgressEvent = {
      kind: "progress",
      operationId,
      jobId: "j-1",
      bytes: 2048,
      sizeBytes: 4096,
      entryKind: "transfer",
    };
    const terminalPayload: OperationProgressEvent = {
      kind: "operation",
      operationId,
      status: "succeeded",
    };

    await pub.publish(channel, JSON.stringify(progressPayload));
    await pub.publish(channel, JSON.stringify(terminalPayload));

    // Race against a timeout so a broken bridge fails instead of hanging.
    await Promise.race([
      done,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("pubsub timeout")), 3000),
      ),
    ]);

    expect(received).toHaveLength(2);
    expect(received[0]).toEqual(progressPayload);
    expect(received[1]).toEqual(terminalPayload);
  });

  test("drops malformed JSON without killing the bridge", async () => {
    const operationId = "op-bridge-2";
    const channel = operationChannel(operationId);

    const received: OperationProgressEvent[] = [];
    const iter = pubsub.subscribe(
      channel as `operation:${string}:progress`,
    );
    const done = (async () => {
      for await (const ev of iter as AsyncIterable<OperationProgressEvent>) {
        received.push(ev);
        break;
      }
    })();

    await Bun.sleep(50);

    // Garbage message — the bridge logs + continues. Subsequent good message
    // still lands.
    await pub.publish(channel, "{not: json");
    await pub.publish(
      channel,
      JSON.stringify({
        kind: "status",
        operationId,
        jobId: "j-2",
        status: "succeeded",
      }),
    );

    await Promise.race([
      done,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("pubsub timeout")), 3000),
      ),
    ]);

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ kind: "status", jobId: "j-2" });
  });
});
