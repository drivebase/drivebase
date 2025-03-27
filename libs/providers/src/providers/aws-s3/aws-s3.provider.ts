/* eslint-disable @typescript-eslint/no-unused-vars */
import { S3Client } from '@aws-sdk/client-s3';
import { AuthType } from '@prisma/client';
import { Readable } from 'stream';

import { BaseProvider } from '../../core/base-provider';
import {
  ApiKeyCredentials,
  AuthContext,
  AuthCredentials,
  FileMetadata,
  FileUpload,
  ListOptions,
  PaginatedResult,
  ProviderCapability,
  ProviderType,
  SearchOptions,
  UploadOptions,
  UserInfo,
} from '../../types';
import { ensureInitialized } from '../../utils';
import { AwsS3AuthStrategy } from './aws-s3.auth';
import { AwsS3Operations } from './aws-s3.operations';

/**
 * AWS S3 provider implementation
 */
export class AwsS3Provider extends BaseProvider {
  readonly type = ProviderType.AMAZON_S3;
  readonly authType = AuthType.API_KEY;
  readonly capabilities = [
    ProviderCapability.READ,
    ProviderCapability.WRITE,
    ProviderCapability.DELETE,
    ProviderCapability.LIST,
    ProviderCapability.SEARCH,
  ];

  private authStrategy: AwsS3AuthStrategy;
  private operations: AwsS3Operations;
  private isInitialized = false;
  private credentials: ApiKeyCredentials;
  private metadata: Record<string, any> = {};

  constructor(config: Record<string, any> = {}) {
    super();
    this.authStrategy = new AwsS3AuthStrategy();
    this.credentials = config as ApiKeyCredentials;
  }

  /**
   * Initialize and authenticate the provider
   */
  async authenticate(
    credentials: AuthCredentials,
    context?: AuthContext,
  ): Promise<void> {
    const s3Creds = credentials as ApiKeyCredentials;

    // Validate credentials
    await this.authStrategy.validateCredentials(s3Creds);

    // Create S3 client
    const s3Client = new S3Client({
      credentials: {
        accessKeyId: s3Creds.accessKeyId,
        secretAccessKey: s3Creds.secretAccessKey,
      },
      region: s3Creds.region || 'us-east-1',
      endpoint: s3Creds.endpoint,
    });

    // Initialize operations
    this.operations = new AwsS3Operations(
      s3Client,
      s3Creds.bucket,
      s3Creds.basePath,
    );

    this.credentials = s3Creds;
    this.isInitialized = true;
  }

  /**
   * Check if the provider is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return Promise.resolve(this.isInitialized);
  }

  /**
   * Get information about the authenticated user
   */
  @ensureInitialized
  async getUserInfo(): Promise<UserInfo> {
    return this.authStrategy.getUserInfo(this.credentials);
  }

  /**
   * List files in a directory
   */
  @ensureInitialized
  async listFiles(
    options?: ListOptions,
  ): Promise<PaginatedResult<FileMetadata>> {
    const result = await this.operations.listFiles(options);
    return result;
  }

  /**
   * Upload a file
   */
  @ensureInitialized
  async uploadFile(
    path: string,
    file: FileUpload,
    options?: UploadOptions,
  ): Promise<FileMetadata> {
    return this.operations.uploadFile(path, file, options);
  }

  /**
   * Download a file
   */
  @ensureInitialized
  async downloadFile(id: string): Promise<Readable> {
    return this.operations.downloadFile(id);
  }

  /**
   * Delete a file
   */
  @ensureInitialized
  async deleteFile(id: string): Promise<boolean> {
    return this.operations.deleteFile(id);
  }

  /**
   * Get metadata for a file
   */
  @ensureInitialized
  async getFileMetadata(id: string): Promise<FileMetadata> {
    return this.operations.getFileMetadata(id);
  }

  /**
   * Create a folder
   */
  @ensureInitialized
  async createFolder(path: string, name: string): Promise<FileMetadata> {
    return this.operations.createFolder(path, name);
  }

  /**
   * Search for files
   */
  @ensureInitialized
  async searchFiles(
    options: SearchOptions,
  ): Promise<PaginatedResult<FileMetadata>> {
    return this.operations.searchFiles(options);
  }

  /**
   * Set provider metadata
   */
  setMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }

  /**
   * Get a pre-signed URL for direct browser upload (optional)
   */
  @ensureInitialized
  async getPresignedUploadUrl(
    path: string,
    filename: string,
    contentType: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    return this.operations.getPresignedUploadUrl(
      path,
      filename,
      contentType,
      expiresInSeconds,
    );
  }
}
