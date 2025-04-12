import { Readable } from 'stream';

import { AuthType } from '@drivebase/providers/provider.entity';

import { BaseProvider } from '../../core/base-provider';
import {
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
import { DarkiboxAuthStrategy, DarkiboxCredentials } from './darkibox.auth';
import { DarkiboxOperations } from './darkibox.operations';

/**
 * Darkibox provider implementation
 */
export class DarkiboxProvider extends BaseProvider {
  readonly type = ProviderType.DARKIBOX;
  readonly authType = AuthType.API_KEY;
  readonly capabilities = [
    ProviderCapability.READ,
    ProviderCapability.WRITE,
    ProviderCapability.DELETE,
    ProviderCapability.LIST,
    ProviderCapability.SEARCH,
  ];

  private authStrategy: DarkiboxAuthStrategy;
  private operations: DarkiboxOperations;
  private isInitialized = false;
  private credentials: DarkiboxCredentials;
  private metadata: Record<string, any> = {};

  constructor(config: Record<string, any> = {}) {
    super();
    this.authStrategy = new DarkiboxAuthStrategy();
    this.credentials = config as DarkiboxCredentials;
  }

  /**
   * Initialize and authenticate the provider
   */
  async authenticate(credentials: AuthCredentials): Promise<void> {
    const darkiboxCreds = credentials as DarkiboxCredentials;

    // Validate credentials
    if (!darkiboxCreds.apiKey) {
      throw new Error('API key is required');
    }

    const isValid = await this.authStrategy.validateApiKey(darkiboxCreds);
    if (!isValid) {
      throw new Error('Invalid API key');
    }

    // Initialize operations
    this.operations = new DarkiboxOperations(darkiboxCreds);

    this.credentials = darkiboxCreds;
    this.isInitialized = true;
  }

  /**
   * Check if the provider is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    if (!this.isInitialized) {
      return false;
    }

    try {
      return await this.authStrategy.validateApiKey(this.credentials);
    } catch {
      return false;
    }
  }

  /**
   * Get information about the authenticated user
   */
  @ensureInitialized
  async getUserInfo(): Promise<UserInfo> {
    return this.authStrategy.getUserInfo(this.credentials);
  }

  /**
   * Get or create the DriveBase root folder
   */
  @ensureInitialized
  async getDrivebaseFolder(): Promise<string> {
    // Create a new folder
    const folderId = await this.operations.createDrivebaseFolder();
    return folderId;
  }

  /**
   * List files in a directory
   */
  @ensureInitialized
  async listFiles(options?: ListOptions): Promise<PaginatedResult<FileMetadata>> {
    const result = await this.operations.listFiles(options);
    return result;
  }

  /**
   * Upload a file
   */
  @ensureInitialized
  async uploadFile(path: string, file: FileUpload, options?: UploadOptions): Promise<FileMetadata> {
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
  async searchFiles(options: SearchOptions): Promise<PaginatedResult<FileMetadata>> {
    return this.operations.searchFiles(options);
  }

  /**
   * Set provider metadata
   */
  setMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
}
