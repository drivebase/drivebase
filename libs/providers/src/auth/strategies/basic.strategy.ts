import { BasicAuthCredentials, UserInfo } from '../../types';

/**
 * Abstract class for basic authentication strategies
 * Each basic auth provider should implement this interface
 */
export abstract class BasicAuthStrategy {
  /**
   * Validate basic auth credentials
   */
  abstract validateCredentials(credentials: BasicAuthCredentials): Promise<boolean>;

  /**
   * Get information about the authenticated user
   */
  abstract getUserInfo(credentials: BasicAuthCredentials): Promise<UserInfo>;
}
