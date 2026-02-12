import type { ProviderConfigField } from "@drivebase/core";
import { z } from "zod";

export const S3ConfigSchema = z.object({
	accessKeyId: z.string().min(1, "Access Key ID is required"),
	secretAccessKey: z.string().min(1, "Secret Access Key is required"),
	bucket: z.string().min(1, "Bucket name is required"),
	region: z.string().min(1, "Region is required"),
	endpoint: z.string().url("Endpoint must be a valid URL").optional(),
	forcePathStyle: z.boolean().optional(),
});

export type S3Config = z.infer<typeof S3ConfigSchema>;

export const S3SensitiveFields = ["accessKeyId", "secretAccessKey"] as const;

export const S3ConfigFields: ProviderConfigField[] = [
	{
		name: "accessKeyId",
		label: "Access Key ID",
		type: "text",
		required: true,
		description: "AWS Access Key ID",
		placeholder: "AKIA...",
	},
	{
		name: "secretAccessKey",
		label: "Secret Access Key",
		type: "password",
		required: true,
		description: "AWS Secret Access Key",
		placeholder: "Secret key...",
	},
	{
		name: "bucket",
		label: "Bucket Name",
		type: "text",
		required: true,
		description: "S3 bucket name",
		placeholder: "my-bucket",
	},
	{
		name: "region",
		label: "Region",
		type: "text",
		required: true,
		description: "AWS region (example: us-east-1)",
		placeholder: "us-east-1",
	},
	{
		name: "endpoint",
		label: "Endpoint",
		type: "text",
		required: false,
		description: "Custom S3 endpoint (MinIO, R2, etc.)",
		placeholder: "https://s3.example.com",
	},
	{
		name: "forcePathStyle",
		label: "Force Path Style",
		type: "boolean",
		required: false,
		description: "Enable for MinIO/LocalStack and some S3-compatible providers",
	},
];
