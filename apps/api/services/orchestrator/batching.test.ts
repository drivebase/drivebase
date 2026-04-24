import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { schema } from "@drivebase/db";
import { startPostgres, type PostgresHarness } from "@drivebase/testing";
import type { ProviderRegistry } from "@drivebase/storage";
import type { AppConfig } from "@drivebase/config";
import { preflight } from "./preflight.ts";

/**
 * Batched preflight: verify fan-out for copy/move/delete/transfer and the
 * shared-provider invariant. The heavy cases (single-source traversal,
 * conflict detection, plan persistence) are covered by integration.test.ts —
 * this file only guards the N-source batching contract.
 */

let pg: PostgresHarness;
let userId: string;
let providerA: string;
let providerB: string;

const registry = {
  get: () => {
    throw new Error("registry.get() not expected in this test");
  },
  has: () => false,
  list: () => [],
} as unknown as ProviderRegistry;

const config = {
  masterKeyBase64: "A".repeat(44),
} as unknown as AppConfig;

async function seedFile(providerId: string, name: string): Promise<string> {
  const [row] = await pg.db
    .insert(schema.nodes)
    .values({
      providerId,
      remoteId: name,
      name,
      type: "file",
      pathText: `/${name}`,
      size: 100,
    })
    .returning();
  if (!row) throw new Error("seed failed");
  return row.id;
}

beforeAll(async () => {
  pg = await startPostgres();

  const [u] = await pg.db
    .insert(schema.user)
    .values({
      id: "u_batch_1",
      name: "Batch Test",
      email: "batch@drivebase.local",
    })
    .returning();
  if (!u) throw new Error("user seed failed");
  userId = u.id;

  const [pa] = await pg.db
    .insert(schema.providers)
    .values({
      userId,
      type: "s3",
      authKind: "credentials",
      label: "bucket-a",
      metadata: {},
    })
    .returning();
  const [pb] = await pg.db
    .insert(schema.providers)
    .values({
      userId,
      type: "s3",
      authKind: "credentials",
      label: "bucket-b",
      metadata: {},
    })
    .returning();
  if (!pa || !pb) throw new Error("provider seed failed");
  providerA = pa.id;
  providerB = pb.id;
}, 120_000);

afterAll(async () => {
  await pg.stop();
}, 60_000);

describe("preflight batching", () => {
  test("move_tree fans out N sources in submission order", async () => {
    const a = await seedFile(providerA, "move-a.txt");
    const b = await seedFile(providerA, "move-b.txt");

    const result = await preflight({
      deps: { db: pg.db, config, registry },
      userId,
      input: {
        kind: "move_tree",
        srcNodeIds: [a, b],
        dstParentId: null,
        strategy: "error",
      },
    });

    expect(result.entries.map((e) => e.src?.name)).toEqual([
      "move-a.txt",
      "move-b.txt",
    ]);
  });

  test("copy_tree accumulates entries under one op", async () => {
    const a = await seedFile(providerA, "copy-a.txt");
    const b = await seedFile(providerA, "copy-b.txt");

    const result = await preflight({
      deps: { db: pg.db, config, registry },
      userId,
      input: {
        kind: "copy_tree",
        srcNodeIds: [a, b],
        dstParentId: null,
        strategy: "error",
      },
    });

    expect(result.entries).toHaveLength(2);
    expect(result.entries.every((e) => e.kind === "copy")).toBe(true);
  });

  test("delete_tree emits one delete per source", async () => {
    const a = await seedFile(providerA, "del-a.txt");
    const b = await seedFile(providerA, "del-b.txt");

    const result = await preflight({
      deps: { db: pg.db, config, registry },
      userId,
      input: { kind: "delete_tree", srcNodeIds: [a, b] },
    });

    expect(result.entries.map((e) => e.kind)).toEqual(["delete", "delete"]);
  });

  test("transfer fans out across the dst provider", async () => {
    const a = await seedFile(providerA, "xfer-a.txt");
    const b = await seedFile(providerA, "xfer-b.txt");

    const result = await preflight({
      deps: { db: pg.db, config, registry },
      userId,
      input: {
        kind: "transfer",
        srcNodeIds: [a, b],
        dstProviderId: providerB,
        dstParentId: null,
        strategy: "error",
      },
    });

    expect(result.entries).toHaveLength(2);
    expect(result.entries.every((e) => e.dst.providerId === providerB)).toBe(
      true,
    );
  });

  test("same-provider ops reject mixed-provider source sets", async () => {
    const a = await seedFile(providerA, "mix-a.txt");
    const b = await seedFile(providerB, "mix-b.txt");

    await expect(
      preflight({
        deps: { db: pg.db, config, registry },
        userId,
        input: {
          kind: "copy_tree",
          srcNodeIds: [a, b],
          dstParentId: null,
          strategy: "error",
        },
      }),
    ).rejects.toThrow(/share one provider/);
  });
});
