import { env } from "../config/env";
import { logger } from "./logger";

/**
 * Generate a 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via email
 * In development, just log to console
 * In production, integrate with email service
 */
export async function sendOTP(email: string, otp: string): Promise<void> {
  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  if (env.NODE_ENV === "development") {
    logger.info({ msg: "OTP Generated", email, otp });
  } else {
    logger.warn({ msg: "Email service not implemented. OTP generated but not sent.", email });
  }
}
