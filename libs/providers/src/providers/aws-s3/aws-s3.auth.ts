import { ApiKeyStrategy } from '../../auth';
import { ApiKeyCredentials, UserInfo } from '../../types';

/**
 * AWS S3 authentication strategy
 * Implements authentication for AWS S3 storage
 */
export class AwsS3AuthStrategy extends ApiKeyStrategy {
  /**
   * Validate S3 credentials
   */
  async validateCredentials(credentials: ApiKeyCredentials): Promise<boolean> {
    try {
      // Validate required fields
      if (!credentials.accessKeyId || !credentials.secretAccessKey || !credentials.bucket) {
        throw new Error(
          'Required credentials missing: accessKeyId, secretAccessKey, and bucket are required',
        );
      }

      // Credentials look valid
      return Promise.resolve(true);
    } catch (error) {
      throw new Error(`Invalid S3 credentials: ${error.message}`);
    }
  }

  /**
   * Get information about the AWS account
   */
  async getUserInfo(credentials: ApiKeyCredentials): Promise<UserInfo> {
    return Promise.resolve({
      id: 'aws-s3',
      name: 'AWS S3',
      displayName: credentials.bucket ? `S3: ${credentials.bucket}` : 'AWS S3',
      email: `s3@${credentials.bucket || 'amazonaws.com'}`,
    });
  }
}
