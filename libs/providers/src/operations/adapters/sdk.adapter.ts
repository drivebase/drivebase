import { FileMetadata } from '../../types';
import { BaseOperations } from '../base-operations';

/**
 * SDK adapter for file operations
 * This adapter can be used for providers that provide an SDK
 */
export abstract class SdkOperationsAdapter<SDK = any> extends BaseOperations {
  protected sdk: SDK;

  constructor(sdk: SDK) {
    super();
    this.sdk = sdk;
  }

  /**
   * Transform a raw SDK response to a FileMetadata object
   */
  protected abstract transformFileResponse(
    response: any,
    path?: string,
  ): FileMetadata;
}
