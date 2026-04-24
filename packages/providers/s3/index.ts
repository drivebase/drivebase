import type { ProviderModule } from "@drivebase/storage";
import { assertS3Creds } from "./client.ts";
import { S3Provider } from "./provider.ts";

export { S3Provider } from "./provider.ts";
export type { S3Creds } from "./client.ts";

export const s3Module: ProviderModule = {
  type: "s3",
  label: "S3-compatible object storage",
  authKind: "credentials",
  credentialFields: [
    {
      key: "accessKeyId",
      label: "Access Key ID",
      type: "text",
      required: true,
    },
    {
      key: "secretAccessKey",
      label: "Secret Access Key",
      type: "password",
      required: true,
    },
    {
      key: "bucket",
      label: "Bucket",
      type: "text",
      required: true,
    },
    {
      key: "region",
      label: "Region",
      type: "text",
      required: false,
      placeholder: "us-east-1",
    },
    {
      key: "endpoint",
      label: "Endpoint",
      type: "url",
      required: false,
      helpText: "Leave blank for AWS. Set for MinIO / R2 / Backblaze etc.",
    },
  ],
  create: ({ credentials }) => new S3Provider(assertS3Creds(credentials)),
};
