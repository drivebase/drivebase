import { S3Client } from "@aws-sdk/client-s3";
import type { ProviderCredentials } from "@drivebase/storage";
import { AuthError } from "@drivebase/storage";

/** Credentials shape after S3-specific validation. */
export type S3Creds = {
  kind: "credentials";
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  region?: string;
  bucket: string;
};

/**
 * Narrow + validate a generic `ProviderCredentials` value into the S3
 * shape. S3 requires a bucket; endpoint/region are optional.
 */
export function assertS3Creds(c: ProviderCredentials): S3Creds {
  if (c.kind !== "credentials") {
    throw new AuthError(`s3 requires kind='credentials', got '${c.kind}'`);
  }
  if (!c.accessKeyId || !c.secretAccessKey) {
    throw new AuthError("s3 credentials missing accessKeyId/secretAccessKey");
  }
  if (!c.bucket) {
    throw new AuthError("s3 credentials missing bucket");
  }
  return {
    kind: "credentials",
    accessKeyId: c.accessKeyId,
    secretAccessKey: c.secretAccessKey,
    endpoint: c.endpoint,
    region: c.region,
    bucket: c.bucket,
  };
}

/**
 * Build an S3Client that works against any S3-compatible endpoint:
 *   - AWS: omit endpoint, set region
 *   - MinIO/R2/Wasabi/B2/Ceph/Spaces: set endpoint + usually path-style
 */
export function buildS3Client(c: S3Creds): S3Client {
  return new S3Client({
    region: c.region ?? "us-east-1",
    endpoint: c.endpoint,
    // Non-AWS S3 implementations almost always need path-style; AWS supports it too.
    forcePathStyle: !!c.endpoint,
    credentials: {
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey,
    },
  });
}
