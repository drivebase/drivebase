/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import axios from 'axios';

import { ApiKeyStrategy } from '../../auth';
import { ApiKeyCredentials, UserInfo } from '../../types';

/**
 * Darkibox API key authentication strategy
 */
export class DarkiboxAuthStrategy extends ApiKeyStrategy {
  private static readonly API_BASE_URL = 'https://darkibox.com/api';

  constructor() {
    super();
  }

  validateCredentials(credentials: ApiKeyCredentials): Promise<boolean> {
    return this.validateApiKey(credentials);
  }

  /**
   * Validate API key by making a request to the Account Info endpoint
   */
  async validateApiKey(credentials: ApiKeyCredentials): Promise<boolean> {
    try {
      const response = await axios.get(
        `${DarkiboxAuthStrategy.API_BASE_URL}/account/info?key=${credentials.apiKey}`,
      );

      // If the response has status 200 and msg="OK", the API key is valid
      return response.data?.status === 200 && response.data?.msg === 'OK';
    } catch (error) {
      console.error('error', error);
      return false;
    }
  }

  /**
   * Get user info from the Darkibox API
   */
  async getUserInfo(credentials: ApiKeyCredentials): Promise<UserInfo> {
    try {
      const response = await axios.get(
        `${DarkiboxAuthStrategy.API_BASE_URL}/account/info?key=${credentials.apiKey}`,
      );

      if (response.data?.status !== 200 || response.data?.msg !== 'OK') {
        throw new Error('Failed to get user info: Invalid API key');
      }

      const accountInfo = response.data.result;

      return {
        id: accountInfo.login, // Use login as ID since there's no specific ID field
        email: accountInfo.email,
        name: accountInfo.login,
        displayName: accountInfo.login,
      };
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  /**
   * Get account stats from the Darkibox API
   */
  async getAccountStats(credentials: ApiKeyCredentials, days = 7): Promise<any> {
    try {
      const response = await axios.get(
        `${DarkiboxAuthStrategy.API_BASE_URL}/account/stats?key=${credentials.apiKey}&last=${days}`,
      );

      if (response.data?.status !== 200 || response.data?.msg !== 'OK') {
        throw new Error('Failed to get account stats: Invalid API key');
      }

      return response.data.result;
    } catch (error) {
      throw new Error(`Failed to get account stats: ${error.message}`);
    }
  }
}

/**
 * Interface for Darkibox credentials
 */
export interface DarkiboxCredentials extends ApiKeyCredentials {
  apiKey: string;
  endpoint: string;
}
