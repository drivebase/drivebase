import { S3 } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { z } from 'zod';

import { ApiKeyProvider, ProviderFile } from '../provider.interface';

interface AwsS3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint: string;
  bucket: string;
}

interface S3ObjectMetadata {
  Key?: string;
  Size?: number;
  LastModified?: Date;
  ETag?: string;
  ContentType?: string;
}

export class AwsS3Provider implements ApiKeyProvider {
  private readonly s3: S3;
  private readonly bucket: string;

  constructor(config: Record<string, string>) {
    const parsedConfig = this.validateConfig(config);
    this.bucket = parsedConfig.bucket;
    this.s3 = this.createS3Client(parsedConfig);
  }

  // File Operations Methods
  async uploadFile(_: string, file: Express.Multer.File): Promise<string> {
    try {
      await this.s3.putObject({
        Bucket: this.bucket,
        Key: file.originalname,
        Body: file.buffer,
        ContentType: file.mimetype,
      });
      return file.originalname;
    } catch (error) {
      throw new Error(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async downloadFile(fileId: string): Promise<Readable> {
    try {
      const response = await this.s3.getObject({
        Bucket: this.bucket,
        Key: fileId,
      });
      return response.Body as Readable;
    } catch (error) {
      throw new Error(
        `Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async deleteFile(path: string): Promise<boolean> {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: path,
      });
      return true;
    } catch (error) {
      throw new Error(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async listFiles(path: string): Promise<ProviderFile[]> {
    try {
      const response = await this.s3.listObjectsV2({
        Bucket: this.bucket,
        Prefix: path,
      });

      return this.mapS3ObjectsToProviderFiles(response.Contents || []);
    } catch (error) {
      throw new Error(
        `Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getFileMetadata(fileId: string): Promise<S3ObjectMetadata> {
    try {
      const response = await this.s3.headObject({
        Bucket: this.bucket,
        Key: fileId,
      });
      return response;
    } catch (error) {
      throw new Error(
        `Failed to get file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // User Information Methods
  getUserInfo() {
    return Promise.resolve({
      id: this.bucket,
      name: this.bucket,
      email: this.bucket,
    });
  }

  async validateCredentials(): Promise<boolean> {
    try {
      await this.s3.listBuckets({});
      return true;
    } catch {
      return false;
    }
  }

  // Private Helper Methods
  private validateConfig(config: Record<string, string>): AwsS3Config {
    return z
      .object({
        region: z.string(),
        accessKeyId: z.string(),
        secretAccessKey: z.string(),
        endpoint: z.string(),
        bucket: z.string(),
      })
      .parse(config);
  }

  private createS3Client(config: AwsS3Config): S3 {
    return new S3({
      region: config.region,
      apiVersion: 'latest',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
    });
  }

  private mapS3ObjectsToProviderFiles(
    objects: S3ObjectMetadata[],
  ): ProviderFile[] {
    return objects.map((file) => ({
      id: file.Key ?? '',
      name: file.Key ?? '',
      size: file.Size ?? 0,
      type: file.Key?.split('.').pop() ?? '',
      isFolder: file.Key?.endsWith('/') ?? false,
    }));
  }
}
