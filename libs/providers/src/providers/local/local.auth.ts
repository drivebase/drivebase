/* eslint-disable @typescript-eslint/no-unused-vars */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { ApiKeyStrategy } from '../../auth';
import { FileSystemCredentials, UserInfo } from '../../types';

/**
 * Local storage authentication strategy
 * Simple auth strategy for local file storage
 */
export class LocalAuthStrategy extends ApiKeyStrategy {
  /**
   * Validate that the path exists and is accessible
   */
  async validateCredentials(credentials: FileSystemCredentials): Promise<boolean> {
    try {
      // Get the storage path from credentials or use a default
      const basePath = this.getBasePath(credentials);

      // Check if the path exists
      await fs.promises.access(basePath, fs.constants.R_OK | fs.constants.W_OK);

      return true;
    } catch (error) {
      throw new Error(`Invalid storage path: ${error.message}`);
    }
  }

  /**
   * Get information about the local system
   */
  async getUserInfo(credentials: FileSystemCredentials): Promise<UserInfo> {
    return Promise.resolve({
      id: 'local',
      name: 'Local Storage',
      displayName: 'Local Storage',
      email: `${os.userInfo().username}@localhost`,
    });
  }

  /**
   * Get the base storage path from credentials or use a default
   */
  getBasePath(credentials: FileSystemCredentials): string {
    // Use provided path or create a default in the user's home directory
    const storagePath = path.join(process.cwd(), 'uploads');

    // Create the directory if it doesn't exist
    if (!fs.existsSync(storagePath)) {
      fs.mkdirSync(storagePath, { recursive: true });
    }

    return storagePath;
  }
}
