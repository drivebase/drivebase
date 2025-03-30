import { ApiKeyCredentials, UserInfo } from '../../types';

/**
 * Abstract class for API key authentication strategies
 * Each API key provider should implement this interface
 */
export abstract class ApiKeyStrategy {
  /**
   * Validate API key credentials
   */
  abstract validateCredentials(
    credentials: ApiKeyCredentials,
  ): Promise<boolean>;

  /**
   * Get information about the authenticated user
   */
  abstract getUserInfo(credentials: ApiKeyCredentials): Promise<UserInfo>;
}
