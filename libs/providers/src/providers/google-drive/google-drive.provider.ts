/* eslint-disable @typescript-eslint/no-unused-vars */
import { AuthType } from '@prisma/client';
import { Readable } from 'stream';

import { BaseProvider } from '../../core/base-provider';
import {
  AuthContext,
  AuthCredentials,
  FileMetadata,
  FileUpload,
  ListOptions,
  OAuth2Credentials,
  ProviderCapability,
  ProviderType,
  SearchOptions,
  UploadOptions,
  UserInfo,
} from '../../types';
import { ensureInitialized } from '../../utils';
import { GoogleDriveAuthStrategy } from './google-drive.auth';
import { GoogleDriveOperations } from './google-drive.operations';

interface GoogleDriveCredentials extends OAuth2Credentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Google Drive provider implementation
 */
export class GoogleDriveProvider extends BaseProvider {
  readonly type = ProviderType.GOOGLE_DRIVE;
  readonly authType = AuthType.OAUTH2;
  readonly capabilities = [
    ProviderCapability.READ,
    ProviderCapability.WRITE,
    ProviderCapability.DELETE,
    ProviderCapability.LIST,
    ProviderCapability.SEARCH,
  ];

  private authStrategy: GoogleDriveAuthStrategy;
  private operations: GoogleDriveOperations;
  private isInitialized = false;
  private credentials: GoogleDriveCredentials;
  private metadata: Record<string, any> = {};

  constructor(config: Record<string, any> = {}) {
    super();
    const { clientId, clientSecret } = config as GoogleDriveCredentials;
    this.authStrategy = new GoogleDriveAuthStrategy(clientId, clientSecret);
    this.credentials = config as GoogleDriveCredentials;
  }

  /**
   * Initialize and authenticate the provider
   */
  async authenticate(
    credentials: AuthCredentials,
    context?: AuthContext,
  ): Promise<void> {
    const googleCreds = credentials as GoogleDriveCredentials;

    // Set up client ID and secret if provided
    if (googleCreds.clientId && googleCreds.clientSecret) {
      this.authStrategy = new GoogleDriveAuthStrategy(
        googleCreds.clientId,
        googleCreds.clientSecret,
      );
    }

    // Validate credentials
    if (!googleCreds.accessToken) {
      throw new Error('Access token is required');
    }

    await this.authStrategy.validateToken(googleCreds);

    // Initialize operations
    const oauth2Client = this.authStrategy.getOAuth2Client(googleCreds);
    this.operations = new GoogleDriveOperations(oauth2Client);

    this.credentials = googleCreds;
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
      return await this.authStrategy.validateToken(this.credentials);
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
  async listFiles(options?: ListOptions): Promise<FileMetadata[]> {
    return this.operations.listFiles(options);
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
  async searchFiles(options: SearchOptions): Promise<FileMetadata[]> {
    return this.operations.searchFiles(options);
  }

  /**
   * Set provider metadata
   */
  setMetadata(metadata: Record<string, any>): void {
    this.metadata = { ...this.metadata, ...metadata };
  }
}
