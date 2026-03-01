/**
 * Main Drivebase SDK Client
 */

import type {
  DrivebaseConfig,
  FileMetadata,
  UploadOptions,
  DownloadOptions,
  ListOptions,
  DeleteOptions,
  UploadResult,
  ListResult,
} from './types';
import {
  DrivebaseError,
  AuthenticationError,
  NotFoundError,
  NetworkError,
} from './errors';

export class DrivebaseClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: DrivebaseConfig = {}) {
    this.apiKey = config.apiKey || process.env.DRIVEBASE_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.drivebase.io';
    this.timeout = config.timeout || 30000;

    if (!this.apiKey) {
      throw new AuthenticationError('API key is required');
    }
  }

  /**
   * Upload a file to Drivebase
   */
  async upload(
    file: File | Buffer | Blob,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const formData = new FormData();
      
      if (file instanceof Buffer) {
        formData.append('file', new Blob([file]));
      } else {
        formData.append('file', file);
      }

      if (options.provider) {
        formData.append('provider', options.provider);
      }
      if (options.path) {
        formData.append('path', options.path);
      }
      if (options.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata));
      }

      const response = await this.request('/files/upload', {
        method: 'POST',
        body: formData,
      });

      return response as UploadResult;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Download a file from Drivebase
   */
  async download(
    fileId: string,
    options: DownloadOptions = {}
  ): Promise<Blob> {
    try {
      const params = new URLSearchParams();
      if (options.provider) {
        params.append('provider', options.provider);
      }

      const response = await fetch(
        `${this.baseUrl}/files/${fileId}/download?${params}`,
        {
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new DrivebaseError(
          `Download failed: ${response.statusText}`,
          'DOWNLOAD_ERROR',
          response.status
        );
      }

      return await response.blob();
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * List files in Drivebase
   */
  async list(options: ListOptions = {}): Promise<ListResult> {
    try {
      const params = new URLSearchParams();
      if (options.provider) params.append('provider', options.provider);
      if (options.path) params.append('path', options.path);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());

      const response = await this.request(`/files?${params}`);
      return response as ListResult;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a file from Drivebase
   */
  async delete(
    fileId: string,
    options: DeleteOptions = {}
  ): Promise<void> {
    try {
      const params = new URLSearchParams();
      if (options.provider) params.append('provider', options.provider);
      if (options.permanent) params.append('permanent', 'true');

      await this.request(`/files/${fileId}?${params}`, {
        method: 'DELETE',
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(fileId: string): Promise<FileMetadata> {
    try {
      const response = await this.request(`/files/${fileId}`);
      return response as FileMetadata;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Make an authenticated request to the Drivebase API
   */
  private async request(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new DrivebaseError(
        error.message || response.statusText,
        error.code,
        response.status
      );
    }

    return response.json();
  }

  /**
   * Get default headers for API requests
   */
  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Handle and transform errors
   */
  private handleError(error: any): Error {
    if (error instanceof DrivebaseError) {
      return error;
    }

    if (error.name === 'AbortError') {
      return new NetworkError('Request timeout');
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new NetworkError('Network request failed');
    }

    return new DrivebaseError(
      error.message || 'Unknown error occurred',
      'UNKNOWN_ERROR'
    );
  }
}
