import { Readable } from "node:stream";
import {
	AbortMultipartUploadCommand,
	CompleteMultipartUploadCommand,
	CopyObjectCommand,
	CreateMultipartUploadCommand,
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	HeadBucketCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
	UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type {
	CopyOptions,
	CreateFolderOptions,
	DeleteOptions,
	DownloadOptions,
	DownloadResponse,
	FileMetadata,
	FolderMetadata,
	IStorageProvider,
	ListOptions,
	ListResult,
	MoveOptions,
	MultipartUploadResult,
	ProviderConfig,
	ProviderQuota,
	UploadOptions,
	UploadPartResult,
	UploadResponse,
} from "@drivebase/core";
import { ProviderError } from "@drivebase/core";
import { type S3Config, S3ConfigSchema } from "./schema";

const FOLDER_MIME_TYPE = "application/x-directory";
const DEFAULT_PAGE_SIZE = 100;

function normalizePrefix(prefix?: string): string {
	if (!prefix) return "";
	const trimmed = prefix.replace(/^\/+|\/+$/g, "");
	return trimmed ? `${trimmed}/` : "";
}

function joinKey(prefix: string | undefined, name: string): string {
	const normalizedPrefix = normalizePrefix(prefix);
	const normalizedName = name.replace(/^\/+/, "");
	return `${normalizedPrefix}${normalizedName}`;
}

function folderKey(prefix: string | undefined, name: string): string {
	return `${joinKey(prefix, name).replace(/\/+$/, "")}/`;
}

function mapAwsError(error: unknown): Record<string, unknown> {
	if (!error || typeof error !== "object") {
		return { error: String(error) };
	}

	const e = error as {
		name?: string;
		message?: string;
		$metadata?: { httpStatusCode?: number };
	};
	return {
		code: e.name,
		message: e.message,
		statusCode: e.$metadata?.httpStatusCode,
	};
}

function toDate(value?: Date | string): Date {
	if (value instanceof Date) return value;
	if (typeof value === "string") return new Date(value);
	return new Date();
}

function isWebReadableStream(value: unknown): value is ReadableStream {
	return Boolean(value && typeof value === "object" && "getReader" in value);
}

function toNodeReadable(value: unknown): Readable {
	if (value instanceof Readable) {
		return value;
	}

	if (value instanceof Uint8Array) {
		return Readable.from(value);
	}

	if (typeof value === "string") {
		return Readable.from(Buffer.from(value));
	}

	if (isWebReadableStream(value)) {
		return Readable.fromWeb(
			value as unknown as import("node:stream/web").ReadableStream,
		);
	}

	throw new Error("Unsupported S3 body stream type");
}

export class S3Provider implements IStorageProvider {
	private client: S3Client | null = null;
	private config: S3Config | null = null;

	supportsChunkedUpload = true;

	async initialize(config: ProviderConfig): Promise<void> {
		const parsed = S3ConfigSchema.safeParse(config);
		if (!parsed.success) {
			throw new ProviderError("s3", "Invalid S3 configuration", {
				errors: parsed.error.errors,
			});
		}

		this.config = parsed.data;
		this.client = new S3Client({
			region: this.config.region,
			endpoint: this.config.endpoint,
			forcePathStyle: this.config.forcePathStyle ?? false,
			credentials: {
				accessKeyId: this.config.accessKeyId,
				secretAccessKey: this.config.secretAccessKey,
			},
		});
	}

	async testConnection(): Promise<boolean> {
		const { client, bucket } = this.ensureInitialized();
		try {
			await client.send(new HeadBucketCommand({ Bucket: bucket }));
			return true;
		} catch {
			return false;
		}
	}

	async getQuota(): Promise<ProviderQuota> {
		const { client, bucket } = this.ensureInitialized();

		try {
			let used = 0;
			let continuationToken: string | undefined;

			do {
				const response = await client.send(
					new ListObjectsV2Command({
						Bucket: bucket,
						ContinuationToken: continuationToken,
						MaxKeys: 1000,
					}),
				);

				for (const object of response.Contents ?? []) {
					used += object.Size ?? 0;
				}

				continuationToken = response.IsTruncated
					? response.NextContinuationToken
					: undefined;
			} while (continuationToken);

			return {
				used,
				total: undefined,
				available: undefined,
			};
		} catch (error) {
			throw new ProviderError("s3", "Failed to compute bucket usage", {
				error: mapAwsError(error),
			});
		}
	}

	async requestUpload(options: UploadOptions): Promise<UploadResponse> {
		const { client, bucket } = this.ensureInitialized();
		const key = joinKey(options.parentId, options.name);

		try {
			const command = new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				ContentType: options.mimeType || "application/octet-stream",
			});

			const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });

			return {
				fileId: key,
				uploadUrl,
				uploadFields: undefined,
				useDirectUpload: true,
			};
		} catch (error) {
			throw new ProviderError("s3", "Failed to generate upload URL", {
				error: mapAwsError(error),
			});
		}
	}

	async uploadFile(
		remoteId: string,
		data: ReadableStream | Buffer,
	): Promise<string | undefined> {
		const { client, bucket } = this.ensureInitialized();

		try {
			await client.send(
				new PutObjectCommand({
					Bucket: bucket,
					Key: remoteId,
					Body: data as unknown as ReadableStream,
				}),
			);
		} catch (error) {
			throw new ProviderError("s3", "Failed to upload file", {
				error: mapAwsError(error),
			});
		}

		return undefined;
	}

	async requestDownload(options: DownloadOptions): Promise<DownloadResponse> {
		const { client, bucket } = this.ensureInitialized();

		try {
			const command = new GetObjectCommand({
				Bucket: bucket,
				Key: options.remoteId,
			});

			const downloadUrl = await getSignedUrl(client, command, {
				expiresIn: 900,
			});

			return {
				fileId: options.remoteId,
				downloadUrl,
				useDirectDownload: true,
			};
		} catch (error) {
			throw new ProviderError("s3", "Failed to generate download URL", {
				error: mapAwsError(error),
			});
		}
	}

	async downloadFile(remoteId: string): Promise<ReadableStream> {
		const { client, bucket } = this.ensureInitialized();

		try {
			const response = await client.send(
				new GetObjectCommand({
					Bucket: bucket,
					Key: remoteId,
				}),
			);

			if (!response.Body) {
				throw new ProviderError("s3", "File content is empty");
			}

			const nodeStream = toNodeReadable(response.Body);
			return Readable.toWeb(nodeStream) as unknown as ReadableStream;
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("s3", "Failed to download file", {
				error: mapAwsError(error),
			});
		}
	}

	async createFolder(options: CreateFolderOptions): Promise<string> {
		const { client, bucket } = this.ensureInitialized();
		const key = folderKey(options.parentId, options.name);

		try {
			await client.send(
				new PutObjectCommand({
					Bucket: bucket,
					Key: key,
					Body: "",
					ContentType: FOLDER_MIME_TYPE,
				}),
			);
			return key;
		} catch (error) {
			throw new ProviderError("s3", "Failed to create folder", {
				error: mapAwsError(error),
			});
		}
	}

	async delete(options: DeleteOptions): Promise<void> {
		const { client, bucket } = this.ensureInitialized();

		try {
			if (!options.isFolder) {
				await client.send(
					new DeleteObjectCommand({
						Bucket: bucket,
						Key: options.remoteId,
					}),
				);
				return;
			}

			const prefix = normalizePrefix(options.remoteId);
			let continuationToken: string | undefined;
			do {
				const response = await client.send(
					new ListObjectsV2Command({
						Bucket: bucket,
						Prefix: prefix,
						ContinuationToken: continuationToken,
						MaxKeys: 1000,
					}),
				);

				const keys = (response.Contents ?? [])
					.map((item) => item.Key)
					.filter((key): key is string => Boolean(key));

				if (keys.length > 0) {
					await client.send(
						new DeleteObjectsCommand({
							Bucket: bucket,
							Delete: {
								Objects: keys.map((Key) => ({ Key })),
								Quiet: true,
							},
						}),
					);
				}

				continuationToken = response.IsTruncated
					? response.NextContinuationToken
					: undefined;
			} while (continuationToken);
		} catch (error) {
			throw new ProviderError("s3", "Failed to delete object(s)", {
				error: mapAwsError(error),
			});
		}
	}

	async move(options: MoveOptions): Promise<void> {
		const { client, bucket } = this.ensureInitialized();

		try {
			if (options.remoteId.endsWith("/")) {
				const sourcePrefix = normalizePrefix(options.remoteId);
				const sourceBase =
					sourcePrefix.slice(0, -1).split("/").filter(Boolean).pop() ?? "";
				const destinationPrefix = folderKey(
					options.newParentId,
					options.newName ?? sourceBase,
				);
				await this.copyPrefix(sourcePrefix, destinationPrefix, client, bucket);
				await this.delete({ remoteId: sourcePrefix, isFolder: true });
				return;
			}

			const originalName =
				options.remoteId.split("/").filter(Boolean).pop() ?? options.remoteId;
			const destinationKey = joinKey(
				options.newParentId,
				options.newName ?? originalName,
			);
			await this.copySingle(options.remoteId, destinationKey, client, bucket);
			await client.send(
				new DeleteObjectCommand({
					Bucket: bucket,
					Key: options.remoteId,
				}),
			);
		} catch (error) {
			throw new ProviderError("s3", "Failed to move object", {
				error: mapAwsError(error),
			});
		}
	}

	async copy(options: CopyOptions): Promise<string> {
		const { client, bucket } = this.ensureInitialized();

		try {
			if (options.remoteId.endsWith("/")) {
				const sourcePrefix = normalizePrefix(options.remoteId);
				const sourceBase =
					sourcePrefix.slice(0, -1).split("/").filter(Boolean).pop() ??
					"folder";
				const destinationPrefix = folderKey(
					options.targetParentId,
					options.newName ?? sourceBase,
				);
				await this.copyPrefix(sourcePrefix, destinationPrefix, client, bucket);
				return destinationPrefix;
			}

			const originalName =
				options.remoteId.split("/").filter(Boolean).pop() ?? options.remoteId;
			const destinationKey = joinKey(
				options.targetParentId,
				options.newName ?? originalName,
			);
			await this.copySingle(options.remoteId, destinationKey, client, bucket);
			return destinationKey;
		} catch (error) {
			throw new ProviderError("s3", "Failed to copy object", {
				error: mapAwsError(error),
			});
		}
	}

	async list(options: ListOptions): Promise<ListResult> {
		const { client, bucket } = this.ensureInitialized();
		const prefix = normalizePrefix(options.folderId);

		try {
			const response = await client.send(
				new ListObjectsV2Command({
					Bucket: bucket,
					Prefix: prefix,
					Delimiter: "/",
					MaxKeys: options.limit ?? DEFAULT_PAGE_SIZE,
					ContinuationToken: options.pageToken,
				}),
			);

			const folders: FolderMetadata[] = (response.CommonPrefixes ?? [])
				.map((item) => item.Prefix)
				.filter((p): p is string => Boolean(p))
				.map((folderPrefix) => ({
					remoteId: folderPrefix,
					name: folderPrefix.slice(0, -1).split("/").pop() ?? folderPrefix,
					modifiedAt: new Date(),
				}));

			const files: FileMetadata[] = (response.Contents ?? [])
				.filter(
					(item) =>
						item.Key && item.Key !== prefix && !(item.Key ?? "").endsWith("/"),
				)
				.map((item) => ({
					remoteId: item.Key as string,
					name: (item.Key as string).split("/").pop() ?? (item.Key as string),
					mimeType: "application/octet-stream",
					size: item.Size ?? 0,
					modifiedAt: toDate(item.LastModified),
					hash: item.ETag?.replace(/"/g, ""),
				}));

			return {
				files,
				folders,
				nextPageToken: response.NextContinuationToken,
			};
		} catch (error) {
			throw new ProviderError("s3", "Failed to list objects", {
				error: mapAwsError(error),
			});
		}
	}

	async getFileMetadata(remoteId: string): Promise<FileMetadata> {
		const { client, bucket } = this.ensureInitialized();

		try {
			const metadata = await client.send(
				new HeadObjectCommand({
					Bucket: bucket,
					Key: remoteId,
				}),
			);

			const name = remoteId.split("/").filter(Boolean).pop() ?? remoteId;
			return {
				remoteId,
				name,
				mimeType: metadata.ContentType ?? "application/octet-stream",
				size: metadata.ContentLength ?? 0,
				modifiedAt: toDate(metadata.LastModified),
				hash: metadata.ETag?.replace(/"/g, ""),
			};
		} catch (error) {
			throw new ProviderError("s3", "Failed to read file metadata", {
				error: mapAwsError(error),
			});
		}
	}

	async getFolderMetadata(remoteId: string): Promise<FolderMetadata> {
		const { client, bucket } = this.ensureInitialized();
		const normalizedFolderId = normalizePrefix(remoteId);

		try {
			const head = await client.send(
				new HeadObjectCommand({
					Bucket: bucket,
					Key: normalizedFolderId,
				}),
			);

			return {
				remoteId: normalizedFolderId,
				name:
					normalizedFolderId.slice(0, -1).split("/").pop() ??
					normalizedFolderId,
				modifiedAt: toDate(head.LastModified),
			};
		} catch {
			const listResponse = await client.send(
				new ListObjectsV2Command({
					Bucket: bucket,
					Prefix: normalizedFolderId,
					MaxKeys: 1,
				}),
			);

			if ((listResponse.KeyCount ?? 0) === 0) {
				throw new ProviderError("s3", "Folder not found", {
					remoteId: normalizedFolderId,
				});
			}

			return {
				remoteId: normalizedFolderId,
				name:
					normalizedFolderId.slice(0, -1).split("/").pop() ??
					normalizedFolderId,
				modifiedAt: toDate(listResponse.Contents?.[0]?.LastModified),
			};
		}
	}

	async initiateMultipartUpload(
		options: UploadOptions,
	): Promise<MultipartUploadResult> {
		const { client, bucket } = this.ensureInitialized();
		const key = joinKey(options.parentId, options.name);

		try {
			const response = await client.send(
				new CreateMultipartUploadCommand({
					Bucket: bucket,
					Key: key,
					ContentType: options.mimeType || "application/octet-stream",
				}),
			);

			if (!response.UploadId) {
				throw new Error("S3 did not return an UploadId");
			}

			return {
				uploadId: response.UploadId,
				remoteId: key,
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("s3", "Failed to initiate multipart upload", {
				error: mapAwsError(error),
			});
		}
	}

	async uploadPart(
		uploadId: string,
		remoteId: string,
		partNumber: number,
		data: Buffer,
	): Promise<UploadPartResult> {
		const { client, bucket } = this.ensureInitialized();

		try {
			const response = await client.send(
				new UploadPartCommand({
					Bucket: bucket,
					Key: remoteId,
					UploadId: uploadId,
					PartNumber: partNumber,
					Body: data,
				}),
			);

			if (!response.ETag) {
				throw new Error("S3 did not return an ETag for part");
			}

			return {
				partNumber,
				etag: response.ETag,
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			throw new ProviderError("s3", `Failed to upload part ${partNumber}`, {
				error: mapAwsError(error),
			});
		}
	}

	async completeMultipartUpload(
		uploadId: string,
		remoteId: string,
		parts: UploadPartResult[],
	): Promise<void> {
		const { client, bucket } = this.ensureInitialized();

		try {
			await client.send(
				new CompleteMultipartUploadCommand({
					Bucket: bucket,
					Key: remoteId,
					UploadId: uploadId,
					MultipartUpload: {
						Parts: parts
							.sort((a, b) => a.partNumber - b.partNumber)
							.map((part) => ({
								PartNumber: part.partNumber,
								ETag: part.etag,
							})),
					},
				}),
			);
		} catch (error) {
			throw new ProviderError("s3", "Failed to complete multipart upload", {
				error: mapAwsError(error),
			});
		}
	}

	async abortMultipartUpload(
		uploadId: string,
		remoteId: string,
	): Promise<void> {
		const { client, bucket } = this.ensureInitialized();

		try {
			await client.send(
				new AbortMultipartUploadCommand({
					Bucket: bucket,
					Key: remoteId,
					UploadId: uploadId,
				}),
			);
		} catch (error) {
			throw new ProviderError("s3", "Failed to abort multipart upload", {
				error: mapAwsError(error),
			});
		}
	}

	/**
	 * Generate presigned URLs for multipart upload parts
	 * Used for direct client-to-S3 multipart uploads
	 */
	async generatePresignedPartUrls(
		uploadId: string,
		remoteId: string,
		totalParts: number,
	): Promise<Array<{ partNumber: number; url: string }>> {
		const { client, bucket } = this.ensureInitialized();

		const urls: Array<{ partNumber: number; url: string }> = [];

		for (let i = 1; i <= totalParts; i++) {
			const command = new UploadPartCommand({
				Bucket: bucket,
				Key: remoteId,
				UploadId: uploadId,
				PartNumber: i,
			});

			const url = await getSignedUrl(client, command, { expiresIn: 3600 });
			urls.push({ partNumber: i, url });
		}

		return urls;
	}

	async cleanup(): Promise<void> {
		this.client = null;
		this.config = null;
	}

	private ensureInitialized(): { client: S3Client; bucket: string } {
		if (!this.client || !this.config) {
			throw new ProviderError("s3", "Provider not initialized");
		}

		return {
			client: this.client,
			bucket: this.config.bucket,
		};
	}

	private async copySingle(
		sourceKey: string,
		destinationKey: string,
		client: S3Client,
		bucket: string,
	) {
		await client.send(
			new CopyObjectCommand({
				Bucket: bucket,
				CopySource: `${bucket}/${sourceKey}`,
				Key: destinationKey,
			}),
		);
	}

	private async copyPrefix(
		sourcePrefix: string,
		destinationPrefix: string,
		client: S3Client,
		bucket: string,
	) {
		let continuationToken: string | undefined;

		do {
			const response = await client.send(
				new ListObjectsV2Command({
					Bucket: bucket,
					Prefix: sourcePrefix,
					ContinuationToken: continuationToken,
					MaxKeys: 1000,
				}),
			);

			const copyOperations = (response.Contents ?? [])
				.map((item) => item.Key)
				.filter((key): key is string => Boolean(key))
				.map(async (sourceKey) => {
					const suffix = sourceKey.slice(sourcePrefix.length);
					const destinationKey = `${destinationPrefix}${suffix}`;
					await this.copySingle(sourceKey, destinationKey, client, bucket);
				});

			await Promise.all(copyOperations);
			continuationToken = response.IsTruncated
				? response.NextContinuationToken
				: undefined;
		} while (continuationToken);
	}
}
