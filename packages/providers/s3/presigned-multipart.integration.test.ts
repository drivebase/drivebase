import { afterAll, beforeAll, expect, test } from "bun:test";
import {
  CreateBucketCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { startMinio, type MinioHarness } from "@drivebase/testing";
import { S3Provider } from "./provider.ts";

/**
 * S3-specific coverage: presigned URLs minted by
 * `S3Provider.generatePresignedPartUrls` are accepted by a live
 * S3-compatible server as PUTs to an in-flight multipart upload, and the
 * ETag the PUT returns can be fed into `completeMultipart` to produce a
 * readable object.
 *
 * The generic multipart lifecycle (initiate → uploadPart → complete) is
 * covered capability-gated in the shared contract suite; this file is
 * specifically for the signer, which is S3-only today.
 */

let minio: MinioHarness;
let provider: S3Provider;

const BUCKET = "drivebase-presign-test";

beforeAll(async () => {
  minio = await startMinio();
  const admin = new S3Client({
    region: "us-east-1",
    endpoint: minio.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: minio.accessKey,
      secretAccessKey: minio.secretKey,
    },
  });
  try {
    await admin.send(new CreateBucketCommand({ Bucket: BUCKET }));
  } finally {
    admin.destroy();
  }
  provider = new S3Provider({
    kind: "credentials",
    accessKeyId: minio.accessKey,
    secretAccessKey: minio.secretKey,
    endpoint: minio.endpoint,
    region: "us-east-1",
    bucket: BUCKET,
  });
}, 180_000);

afterAll(async () => {
  await minio?.stop();
}, 60_000);

test("presigned PUT round-trip: initiate → PUT → complete → retrievable", async () => {
  const payload = new TextEncoder().encode("presigned-multipart-roundtrip-ok");
  const name = "hello.txt";

  const { uploadId, key } = await provider.initiateMultipart({
    parentRemoteId: null,
    name,
  });
  const [presigned] = await provider.generatePresignedPartUrls({
    uploadId,
    key,
    partNumbers: [1],
  });
  if (!presigned) throw new Error("no presigned url");

  const putRes = await fetch(presigned.url, {
    method: "PUT",
    body: payload,
  });
  expect(putRes.ok).toBe(true);
  const rawEtag = putRes.headers.get("etag");
  if (!rawEtag) throw new Error("missing etag header");
  const etag = rawEtag.replaceAll('"', "");

  const remote = await provider.completeMultipart({
    uploadId,
    key,
    parts: [{ partNumber: 1, etag }],
  });
  expect(remote.remoteId).toBe(key);

  const reader = new S3Client({
    region: "us-east-1",
    endpoint: minio.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: minio.accessKey,
      secretAccessKey: minio.secretKey,
    },
  });
  try {
    const got = await reader.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );
    expect(await got.Body?.transformToString()).toBe(
      new TextDecoder().decode(payload),
    );
  } finally {
    reader.destroy();
  }
}, 60_000);
