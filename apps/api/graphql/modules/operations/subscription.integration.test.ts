import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { parse, subscribe, type ExecutionResult } from "graphql";
import type { Redis } from "ioredis";
import { createLogger } from "@drivebase/logger";
import { schema as dbSchema } from "@drivebase/db";
import type { AppConfig } from "@drivebase/config";
import {
  connectRedis,
  startPostgres,
  startRedis,
  type PostgresHarness,
  type RedisHarness,
} from "@drivebase/testing";
import { buildSchema } from "~/graphql/schema.ts";
import { startRedisBridge } from "~/bridge.ts";
import { globalRegistry } from "@drivebase/storage";
import {
  operationChannel,
  pubsub,
  type OperationProgressEvent,
} from "~/pubsub.ts";
import type { GraphQLContext } from "~/graphql/context.ts";
import { CacheService } from "@drivebase/cache";

/**
 * Exercises the full Subscription path inside this process:
 *
 *   PUBLISH (redis) → bridge PSUBSCRIBE → pubsub → resolver async iterator
 *   → GraphQL union __resolveType → client receives typed event.
 *
 * We invoke `subscribe` from `graphql-js` directly instead of booting the
 * HTTP server — same code path as Yoga, fewer moving parts in the test.
 */

let pg: PostgresHarness;
let redis: RedisHarness;
let pub: Redis;
let sub: Redis;
let bridgeStop: () => Promise<void>;
let gqlSchema: Awaited<ReturnType<typeof buildSchema>>;
let userId: string;
let operationId: string;

beforeAll(async () => {
  [pg, redis] = await Promise.all([startPostgres(), startRedis()]);

  const [u] = await pg.db
    .insert(dbSchema.user)
    .values({
      id: "u_sub_1",
      name: "Sub Test",
      email: "sub@drivebase.local",
    })
    .returning();
  if (!u) throw new Error("user seed failed");
  userId = u.id;

  const [op] = await pg.db
    .insert(dbSchema.operations)
    .values({
      userId,
      kind: "transfer",
      strategy: "overwrite",
      status: "running",
      plan: {},
    })
    .returning();
  if (!op) throw new Error("operation seed failed");
  operationId = op.id;

  // `connectRedis` waits for the `ready` event and installs a no-op
  // `error` listener — avoids ioredis's "Unhandled error event" noise
  // from the brief window between container-log-ready and TCP accept.
  [pub, sub] = await Promise.all([
    connectRedis(redis.url),
    connectRedis(redis.url),
  ]);
  const log = createLogger({
    env: "prod",
    level: "warn",
    base: { app: "sub-int-test" },
  });
  const br = await startRedisBridge({ sub, log });
  bridgeStop = br.stop;

  gqlSchema = await buildSchema();
}, 180_000);

afterAll(async () => {
  await bridgeStop?.();
  await pub?.quit().catch(() => {});
  await sub?.quit().catch(() => {});
  await Promise.allSettled([pg?.stop(), redis?.stop()]);
}, 60_000);

function makeContext(): GraphQLContext {
  const log = createLogger({
    env: "prod",
    level: "warn",
    base: { app: "ctx" },
  });
  const config: AppConfig = {
    server: { env: "dev", port: 0, host: "127.0.0.1" },
    db: { url: pg.url },
    redis: { url: redis.url },
    crypto: { masterKeyBase64: "A".repeat(44) },
    auth: {
      betterAuthSecret: "x".repeat(32),
      baseUrl: "http://localhost:4000",
      trustedOrigins: [],
    },
    uploads: {
      stagingDir: "/tmp/drivebase-uploads-test",
      defaultChunkSizeBytes: 8 * 1024 * 1024,
      sessionTtlSeconds: 24 * 60 * 60,
    },
    cache: {
      childrenTtlSeconds: 60,
      usageTtlSeconds: 600,
    },
    workers: {
      concurrency: {
        upload: 1,
        download: 1,
        transfer: 1,
        copy: 1,
        move: 1,
        delete: 1,
        syncReconcile: 1,
        usageRefresh: 1,
      },
    },
    log: { level: "warn" },
  };
  const cache = new CacheService(pub, {
    children: config.cache.childrenTtlSeconds,
    usage: config.cache.usageTtlSeconds,
  });
  return {
    db: pg.db,
    log,
    config,
    registry: globalRegistry,
    pubsub,
    redis: pub,
    cache,
    user: { id: userId, email: "sub@drivebase.local", name: "Sub Test" },
    requestId: "test",
  };
}

describe("operationProgress subscription (integration)", () => {
  test("streams typed events until terminal, then closes", async () => {
    const doc = parse(/* GraphQL */ `
      subscription Op($id: ID!) {
        operationProgress(operationId: $id) {
          __typename
          ... on ProgressEvent {
            bytes
            jobId
            entryKind
          }
          ... on OperationStatusEvent {
            status
          }
        }
      }
    `);

    const result = await subscribe({
      schema: gqlSchema,
      document: doc,
      variableValues: { id: operationId },
      contextValue: makeContext(),
    });

    if (!("next" in result)) {
      throw new Error(
        `expected async iterable, got: ${JSON.stringify(result)}`,
      );
    }

    // Collect the emitted events off the iterator in the background. Stop
    // once we've seen the terminal flip (operationProgress should close
    // itself after an OperationStatusEvent).
    const collected: ExecutionResult[] = [];
    const pump = (async () => {
      for await (const ev of result) collected.push(ev);
    })();

    // PSUBSCRIBE / resolver iterator setup races — small sleep so our
    // first PUBLISH can't land before the subscription is live.
    await Bun.sleep(100);

    const progress: OperationProgressEvent = {
      kind: "progress",
      operationId,
      jobId: "j-1",
      bytes: 1024,
      sizeBytes: 4096,
      entryKind: "transfer",
    };
    const terminal: OperationProgressEvent = {
      kind: "operation",
      operationId,
      status: "succeeded",
    };
    await pub.publish(operationChannel(operationId), JSON.stringify(progress));
    await pub.publish(operationChannel(operationId), JSON.stringify(terminal));

    // Wait for the subscription to close itself after the terminal flip.
    await Promise.race([
      pump,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("subscription did not close")), 5000),
      ),
    ]);

    expect(collected).toHaveLength(2);
    const first = collected[0]?.data?.operationProgress as
      | Record<string, unknown>
      | undefined;
    const second = collected[1]?.data?.operationProgress as
      | Record<string, unknown>
      | undefined;
    expect(first).toMatchObject({
      __typename: "ProgressEvent",
      // BigInt scalar serializes to string.
      bytes: "1024",
      jobId: "j-1",
      entryKind: "transfer",
    });
    expect(second).toMatchObject({
      __typename: "OperationStatusEvent",
      status: "succeeded",
    });
  }, 60_000);

  test("returns notFound when the op belongs to someone else", async () => {
    const doc = parse(/* GraphQL */ `
      subscription Op($id: ID!) {
        operationProgress(operationId: $id) {
          __typename
        }
      }
    `);

    // Seed a second user and an op they own.
    const [otherUser] = await pg.db
      .insert(dbSchema.user)
      .values({
        id: "u_sub_2",
        name: "Other",
        email: "other@drivebase.local",
      })
      .returning();
    if (!otherUser) throw new Error("other user seed failed");
    const [otherOp] = await pg.db
      .insert(dbSchema.operations)
      .values({
        userId: otherUser.id,
        kind: "transfer",
        strategy: "overwrite",
        status: "running",
        plan: {},
      })
      .returning();
    if (!otherOp) throw new Error("other op seed failed");

    // Run the subscription as the *first* user — must 404.
    const result = await subscribe({
      schema: gqlSchema,
      document: doc,
      variableValues: { id: otherOp.id },
      contextValue: makeContext(),
    });

    // Our resolver is an async generator — the throw happens on first
    // `.next()`, not synchronously inside subscribe(). So we pull once and
    // expect to see the error surface there.
    if (!("next" in result)) {
      expect(result.errors?.[0]?.message).toContain("operation not found");
      return;
    }
    let caught: Error | undefined;
    try {
      await result.next();
    } catch (e) {
      caught = e as Error;
    }
    expect(caught?.message).toContain("operation not found");
  });
});
