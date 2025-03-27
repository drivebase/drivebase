import { AuthType } from '@prisma/client';
import { Readable } from 'stream';

import { BaseProvider } from '../../core/base-provider';
import { LocalOperationsAdapter } from '../../operations';
import {
  AuthCredentials,
  FileMetadata,
  FileSystemCredentials,
  FileUpload,
  ListOptions,
  PaginatedResult,
  ProviderCapability,
  ProviderType,
  UploadOptions,
  UserInfo,
} from '../../types';
import { ensureInitialized } from '../../utils';
import { LocalAuthStrategy } from './local.auth';

/**
 * Local file system provider
 * Implements file operations using the local file system
 */
export class LocalProvider extends BaseProvider {
  readonly type = ProviderType.LOCAL;
  readonly authType = AuthType.NONE;
  readonly capabilities = [
    ProviderCapability.READ,
    ProviderCapability.WRITE,
    ProviderCapability.DELETE,
    ProviderCapability.LIST,
  ];

  private authStrategy: LocalAuthStrategy;
  private operations: LocalOperationsAdapter;
  private isInitialized = false;
  private credentials: FileSystemCredentials;

  constructor(config: Record<string, any> = {}) {
    super();
    this.authStrategy = new LocalAuthStrategy();
    this.credentials = config as FileSystemCredentials;
  }

  /**
   * Initialize the provider with credentials
   */
  async authenticate(credentials: AuthCredentials): Promise<void> {
    const localCreds = credentials as FileSystemCredentials;
    await this.authStrategy.validateCredentials(localCreds);

    const basePath = this.authStrategy.getBasePath(localCreds);
    this.operations = new LocalOperationsAdapter(basePath);

    this.credentials = localCreds;
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
}
