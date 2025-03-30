import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

import { FileMetadata } from '../../types';
import { BaseOperations } from '../base-operations';

/**
 * REST API adapter for file operations
 * This adapter can be used for providers that expose a REST API
 */
export abstract class RestOperationsAdapter extends BaseOperations {
  protected client: AxiosInstance;

  constructor(config: AxiosRequestConfig) {
    super();
    this.client = axios.create(config);
  }

  /**
   * Transform a raw API response to a FileMetadata object
   */
  protected abstract transformFileResponse(
    response: any,
    path?: string,
  ): FileMetadata;

  /**
   * Build the URL for a file operation
   */
  protected abstract buildUrl(
    endpoint: string,
    options?: Record<string, any>,
  ): string;

  /**
   * Set authentication headers for requests
   */
  protected abstract setAuthHeaders(
    config: AxiosRequestConfig,
  ): AxiosRequestConfig;
}
