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
  NetworkError,
} from './errors';

export class DrivebaseClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: DrivebaseConfig = {}) {
    this.apiKey = config.apiKey || (typeof process !== 'undefined' ? process.env?.DRIVEBASE_API_KEY : undefined) || '';
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
    file: File | Blob,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      if (options.provider) {
        formData.append('provider', options.provider);
      }
      if (options.path) {
        formData.append('path', options.path);
      }
      if (options.metadata) {
        formData.append('metadata', JSON.stringify(options.metadata));
      }

      // Upload needs special handling - don't set Content-Type for FormData
      const url = `${this.baseUrl}/files/upload`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
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

      return await response.json();
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

      const url = `${this.baseUrl}/files/${fileId}/download?${params}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        signal: AbortSignal.timeout(this.timeout),
      });

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
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
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
