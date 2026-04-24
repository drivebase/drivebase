import { afterAll, beforeAll } from "bun:test";
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { runContract } from "@drivebase/storage/testing/contract";
import { startMinio, type MinioHarness } from "@drivebase/testing";
import { S3Provider } from "./provider.ts";

/**
 * Runs the shared IStorageProvider contract suite against an ephemeral
 * MinIO (spun up via testcontainers). Picks up the capability-gated
 * multipart scenario automatically — the thing that motivated this file.
 *
 * The sibling `provider.test.ts` keeps its RUN_INTEGRATION gate and points
 * at an externally-managed S3 endpoint (real AWS, compose-run MinIO, etc.)
 * so we still have an escape hatch for pre-deploy smoke tests.
 */

let minio: MinioHarness;
let admin: S3Client;

const BUCKET = "drivebase-contract";

beforeAll(async () => {
  minio = await startMinio();
  admin = new S3Client({
    region: "us-east-1",
    endpoint: minio.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: minio.accessKey,
      secretAccessKey: minio.secretKey,
    },
  });
  await admin.send(new CreateBucketCommand({ Bucket: BUCKET }));
}, 180_000);

afterAll(async () => {
  admin?.destroy();
  await minio?.stop();
}, 60_000);

runContract({
  name: "s3 (testcontainers minio)",
  createProvider: async () =>
    new S3Provider({
      kind: "credentials",
      accessKeyId: minio.accessKey,
      secretAccessKey: minio.secretKey,
      endpoint: minio.endpoint,
      region: "us-east-1",
      bucket: BUCKET,
    }),
  cleanup: async () => {
    // Drain the bucket between scenarios so each one starts clean.
    let token: string | undefined;
    do {
      const res = await admin.send(
        new ListObjectsV2Command({
          Bucket: BUCKET,
          ContinuationToken: token,
        }),
      );
      const keys = (res.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => typeof k === "string");
      if (keys.length > 0) {
        await admin.send(
          new DeleteObjectsCommand({
            Bucket: BUCKET,
            Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
          }),
        );
      }
      token = res.NextContinuationToken;
    } while (token);
  },
});
