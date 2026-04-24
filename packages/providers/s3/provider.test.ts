/**
 * Integration test — runs the shared IStorageProvider contract suite
 * against a local MinIO (compose.yml service).
 *
 * Gated behind RUN_INTEGRATION so unit runs stay hermetic. Run with:
 *   cd packages/providers/s3 && bun run test:integration
 *
 * Works against any S3-compatible endpoint. Override via env:
 *   S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET
 */
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { runContract } from "@drivebase/storage/testing/contract";
import { S3Provider } from "./provider.ts";
import { assertS3Creds } from "./client.ts";

const RUN = Bun.env.RUN_INTEGRATION === "1";

const endpoint = Bun.env.S3_ENDPOINT ?? "http://127.0.0.1:9000";
const region = Bun.env.S3_REGION ?? "us-east-1";
const accessKeyId = Bun.env.S3_ACCESS_KEY_ID ?? "minioadmin";
const secretAccessKey = Bun.env.S3_SECRET_ACCESS_KEY ?? "minioadmin";
const bucket =
  Bun.env.S3_BUCKET ?? `drivebase-test-${Date.now().toString(36)}`;

if (!RUN) {
  // Skip the suite entirely; don't even touch the network.
  // biome-ignore lint/suspicious/noConsoleLog: test runner feedback
  console.log("[s3] skipping integration test (set RUN_INTEGRATION=1)");
} else {
  const admin = new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });

  // Ensure the bucket exists before the contract suite starts.
  try {
    await admin.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await admin.send(new CreateBucketCommand({ Bucket: bucket }));
  }

  const creds = assertS3Creds({
    kind: "credentials",
    accessKeyId,
    secretAccessKey,
    endpoint,
    region,
    bucket,
  });

  runContract({
    name: `s3 @ ${endpoint}/${bucket}`,
    createProvider: async () => new S3Provider(creds),
    cleanup: async () => {
      // Empty every object in the bucket, page by page.
      let token: string | undefined;
      do {
        const res = await admin.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            ContinuationToken: token,
          }),
        );
        const keys = (res.Contents ?? [])
          .map((o) => o.Key)
          .filter((k): k is string => typeof k === "string");
        if (keys.length > 0) {
          await admin.send(
            new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
            }),
          );
        }
        token = res.IsTruncated ? res.NextContinuationToken : undefined;
      } while (token);
      admin.destroy();
    },
  });
}
